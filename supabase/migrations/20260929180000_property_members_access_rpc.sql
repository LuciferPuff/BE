-- Fas F: RPC för att lista property_members med profilinfo,
-- och e-postuppslag endast för ägare (invitiera befintliga konton).

create or replace function public.get_property_members(p_property_id uuid)
returns table (
  member_id uuid,
  user_id uuid,
  role public.property_role,
  full_name text,
  email text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.get_property_role(p_property_id) is null
     and public.get_app_role() not in ('admin', 'super_admin') then
    raise exception 'Not a member of this property';
  end if;

  return query
  select
    pm.id as member_id,
    pm.user_id,
    pm.role,
    p.full_name,
    p.email,
    pm.created_at
  from public.property_members pm
  join public.profiles p on p.id = pm.user_id
  where pm.property_id = p_property_id
  order by
    case pm.role
      when 'agare' then 0
      when 'medlem' then 1
      else 2
    end,
    pm.created_at asc;
end;
$$;

comment on function public.get_property_members(uuid) is
  'Lists property members with display name/email. Caller must be a member (or staff).';

-- Resolve profile id by email for invites. Only property owners may call.
create or replace function public.find_profile_id_by_email_for_owner(
  p_property_id uuid,
  p_email text
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text;
  v_id uuid;
begin
  if public.get_property_role(p_property_id) is distinct from 'agare'
     and public.get_app_role() is distinct from 'super_admin' then
    raise exception 'Only property owners can look up profiles for invites';
  end if;

  v_email := lower(trim(p_email));
  if v_email = '' then
    return null;
  end if;

  select p.id into v_id
  from public.profiles p
  where p.email is not null
    and lower(trim(p.email)) = v_email
  limit 1;

  return v_id;
end;
$$;

comment on function public.find_profile_id_by_email_for_owner(uuid, text) is
  'Owner-only email → profile id lookup for adding property members.';

revoke all on function public.get_property_members(uuid) from public;
revoke all on function public.find_profile_id_by_email_for_owner(uuid, text) from public;

grant execute on function public.get_property_members(uuid) to authenticated;
grant execute on function public.find_profile_id_by_email_for_owner(uuid, text) to authenticated;
