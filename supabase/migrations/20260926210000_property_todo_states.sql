-- Fas C: Att göra-status per fastighet (bocka av + anteckning).
create table if not exists public.property_todo_states (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  task_key text not null,
  completed_at timestamptz,
  note text,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (property_id, task_key)
);

comment on table public.property_todo_states is
  'Användarens bockningar/anteckningar för Att göra-listan. Uppgifterna genereras i appen.';

create index if not exists property_todo_states_property_id_idx
  on public.property_todo_states (property_id);

alter table public.property_todo_states enable row level security;

grant select, insert, update, delete on table public.property_todo_states to authenticated;

create policy "property_todo_states_select_member_or_staff"
  on public.property_todo_states
  for select
  to authenticated
  using (
    public.get_property_role(property_id) is not null
    or public.get_app_role() in ('admin', 'super_admin')
  );

create policy "property_todo_states_insert_agare_medlem_or_super_admin"
  on public.property_todo_states
  for insert
  to authenticated
  with check (
    public.get_property_role(property_id) in ('agare', 'medlem')
    or public.get_app_role() = 'super_admin'
  );

create policy "property_todo_states_update_agare_medlem_or_super_admin"
  on public.property_todo_states
  for update
  to authenticated
  using (
    public.get_property_role(property_id) in ('agare', 'medlem')
    or public.get_app_role() = 'super_admin'
  )
  with check (
    public.get_property_role(property_id) in ('agare', 'medlem')
    or public.get_app_role() = 'super_admin'
  );

create policy "property_todo_states_delete_owner_or_super_admin"
  on public.property_todo_states
  for delete
  to authenticated
  using (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  );
