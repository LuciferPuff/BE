-- Etapp 1: Fastighetsprofil – RLS, hjälpfunktioner och grants.

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER-hjälpfunktioner (undviker rekursiv RLS på property_members)
-- ---------------------------------------------------------------------------

create or replace function public.get_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select app_role from public.profiles where id = auth.uid();
$$;

create or replace function public.get_property_role(p_property_id uuid)
returns public.property_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.property_members
  where property_id = p_property_id
    and user_id = auth.uid();
$$;

create or replace function public.property_has_owner(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.property_members
    where property_id = p_property_id
      and role = 'agare'
  );
$$;

create or replace function public.count_property_owners(p_property_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.property_members
  where property_id = p_property_id
    and role = 'agare';
$$;

revoke all on function public.get_app_role() from public;
revoke all on function public.get_property_role(uuid) from public;
revoke all on function public.property_has_owner(uuid) from public;
revoke all on function public.count_property_owners(uuid) from public;

grant execute on function public.get_app_role() to authenticated;
grant execute on function public.get_property_role(uuid) to authenticated;
grant execute on function public.property_has_owner(uuid) to authenticated;
grant execute on function public.count_property_owners(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- profiles: lås app_role (endast super_admin får ändra)
-- ---------------------------------------------------------------------------

create or replace function public.profiles_guard_app_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.app_role;
begin
  if new.app_role is not distinct from old.app_role then
    return new;
  end if;

  select p.app_role into actor_role
  from public.profiles p
  where p.id = auth.uid();

  if actor_role is distinct from 'super_admin'::public.app_role then
    raise exception 'Only super_admin can change app_role';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_app_role
  before update on public.profiles
  for each row
  execute function public.profiles_guard_app_role();

-- ---------------------------------------------------------------------------
-- property_members: förhindra att sista ägaren tas bort / degraderas
-- ---------------------------------------------------------------------------

create or replace function public.property_members_guard_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'agare'
       and public.count_property_owners(old.property_id) <= 1 then
      raise exception 'Cannot remove the last owner of a property';
    end if;
    return old;
  end if;

  -- UPDATE: degradera ägare till annan roll
  if old.role = 'agare'
     and new.role is distinct from 'agare'
     and public.count_property_owners(old.property_id) <= 1 then
    raise exception 'Cannot demote the last owner of a property';
  end if;

  return new;
end;
$$;

create trigger property_members_guard_last_owner
  before update or delete on public.property_members
  for each row
  execute function public.property_members_guard_last_owner();

-- ---------------------------------------------------------------------------
-- Aktivera RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_members enable row level security;
alter table public.property_documents enable row level security;
alter table public.property_events enable row level security;
alter table public.property_valuations enable row level security;
-- analyses har redan RLS aktiverat (service role för anonymt flöde).

-- ---------------------------------------------------------------------------
-- Grants (authenticated)
-- ---------------------------------------------------------------------------

grant select, update on table public.profiles to authenticated;

grant select, insert, update, delete on table public.properties to authenticated;
grant select, insert, update, delete on table public.property_members to authenticated;
grant select, insert, update, delete on table public.property_documents to authenticated;
grant select, insert, update, delete on table public.property_events to authenticated;
grant select, insert, update, delete on table public.property_valuations to authenticated;

grant select on table public.analyses to authenticated;

-- ---------------------------------------------------------------------------
-- profiles policies
-- ---------------------------------------------------------------------------

create policy "profiles_select_own_or_staff"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.get_app_role() in ('admin', 'super_admin')
  );

create policy "profiles_update_own_or_super_admin"
  on public.profiles
  for update
  to authenticated
  using (
    id = auth.uid()
    or public.get_app_role() = 'super_admin'
  )
  with check (
    id = auth.uid()
    or public.get_app_role() = 'super_admin'
  );

-- INSERT/DELETE: ingen användarpolicy (trigger på auth.users / cascade)

-- ---------------------------------------------------------------------------
-- properties policies
-- ---------------------------------------------------------------------------

create policy "properties_select_member_or_staff"
  on public.properties
  for select
  to authenticated
  using (
    public.get_property_role(id) is not null
    or public.get_app_role() in ('admin', 'super_admin')
  );

create policy "properties_insert_authenticated"
  on public.properties
  for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "properties_update_owner_or_super_admin"
  on public.properties
  for update
  to authenticated
  using (
    public.get_property_role(id) = 'agare'
    or public.get_app_role() = 'super_admin'
  )
  with check (
    public.get_property_role(id) = 'agare'
    or public.get_app_role() = 'super_admin'
  );

create policy "properties_delete_owner_or_super_admin"
  on public.properties
  for delete
  to authenticated
  using (
    public.get_property_role(id) = 'agare'
    or public.get_app_role() = 'super_admin'
  );

-- ---------------------------------------------------------------------------
-- property_members policies
-- ---------------------------------------------------------------------------

create policy "property_members_select_member_or_staff"
  on public.property_members
  for select
  to authenticated
  using (
    public.get_property_role(property_id) is not null
    or public.get_app_role() in ('admin', 'super_admin')
  );

create policy "property_members_insert_owner_bootstrap_or_super_admin"
  on public.property_members
  for insert
  to authenticated
  with check (
    public.get_app_role() = 'super_admin'
    or public.get_property_role(property_id) = 'agare'
    or (
      user_id = auth.uid()
      and role = 'agare'
      and not public.property_has_owner(property_id)
    )
  );

create policy "property_members_update_owner_or_super_admin"
  on public.property_members
  for update
  to authenticated
  using (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  )
  with check (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  );

create policy "property_members_delete_owner_or_super_admin"
  on public.property_members
  for delete
  to authenticated
  using (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  );

-- ---------------------------------------------------------------------------
-- property_documents / property_events / property_valuations
-- ---------------------------------------------------------------------------

create policy "property_documents_select_member_or_staff"
  on public.property_documents
  for select
  to authenticated
  using (
    public.get_property_role(property_id) is not null
    or public.get_app_role() in ('admin', 'super_admin')
  );

create policy "property_documents_insert_agare_medlem_or_super_admin"
  on public.property_documents
  for insert
  to authenticated
  with check (
    public.get_property_role(property_id) in ('agare', 'medlem')
    or public.get_app_role() = 'super_admin'
  );

create policy "property_documents_update_owner_or_super_admin"
  on public.property_documents
  for update
  to authenticated
  using (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  )
  with check (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  );

create policy "property_documents_delete_owner_or_super_admin"
  on public.property_documents
  for delete
  to authenticated
  using (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  );

create policy "property_events_select_member_or_staff"
  on public.property_events
  for select
  to authenticated
  using (
    public.get_property_role(property_id) is not null
    or public.get_app_role() in ('admin', 'super_admin')
  );

create policy "property_events_insert_agare_medlem_or_super_admin"
  on public.property_events
  for insert
  to authenticated
  with check (
    public.get_property_role(property_id) in ('agare', 'medlem')
    or public.get_app_role() = 'super_admin'
  );

create policy "property_events_update_owner_or_super_admin"
  on public.property_events
  for update
  to authenticated
  using (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  )
  with check (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  );

create policy "property_events_delete_owner_or_super_admin"
  on public.property_events
  for delete
  to authenticated
  using (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  );

create policy "property_valuations_select_member_or_staff"
  on public.property_valuations
  for select
  to authenticated
  using (
    public.get_property_role(property_id) is not null
    or public.get_app_role() in ('admin', 'super_admin')
  );

create policy "property_valuations_insert_agare_medlem_or_super_admin"
  on public.property_valuations
  for insert
  to authenticated
  with check (
    public.get_property_role(property_id) in ('agare', 'medlem')
    or public.get_app_role() = 'super_admin'
  );

create policy "property_valuations_update_owner_or_super_admin"
  on public.property_valuations
  for update
  to authenticated
  using (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  )
  with check (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  );

create policy "property_valuations_delete_owner_or_super_admin"
  on public.property_valuations
  for delete
  to authenticated
  using (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  );

-- ---------------------------------------------------------------------------
-- analyses: behåll anonymt flöde (service role, inga anon-policies).
-- Länkade rader: SELECT för fastighetsmedlemmar / staff.
-- ---------------------------------------------------------------------------

create policy "analyses_select_linked_property_member_or_staff"
  on public.analyses
  for select
  to authenticated
  using (
    linked_property_id is not null
    and (
      public.get_property_role(linked_property_id) is not null
      or public.get_app_role() in ('admin', 'super_admin')
    )
  );
