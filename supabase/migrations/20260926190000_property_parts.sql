-- Fas B: verifierade husdelar (överskriver antagen ålder från byggår).
create table if not exists public.property_parts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  part_key text not null,
  replaced_year integer,
  note text,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (property_id, part_key),
  constraint property_parts_replaced_year_check
    check (
      replaced_year is null
      or (replaced_year >= 1800 and replaced_year <= 2100)
    )
);

comment on table public.property_parts is
  'Verifierade byten/åldrar per husdel. Saknad rad = antag från properties.construction_year.';

comment on column public.property_parts.part_key is
  'Katalognyckel: tak, fasad, fonster, dranering, grund, badrum, uppvarmning, ventilation, el, va.';

comment on column public.property_parts.replaced_year is
  'År då delen senast byttes/renoverades. Null = okänt/rensa till antagen.';

create index if not exists property_parts_property_id_idx
  on public.property_parts (property_id);

alter table public.property_parts enable row level security;

grant select, insert, update, delete on table public.property_parts to authenticated;

create policy "property_parts_select_member_or_staff"
  on public.property_parts
  for select
  to authenticated
  using (
    public.get_property_role(property_id) is not null
    or public.get_app_role() in ('admin', 'super_admin')
  );

create policy "property_parts_insert_agare_medlem_or_super_admin"
  on public.property_parts
  for insert
  to authenticated
  with check (
    public.get_property_role(property_id) in ('agare', 'medlem')
    or public.get_app_role() = 'super_admin'
  );

create policy "property_parts_update_agare_medlem_or_super_admin"
  on public.property_parts
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

create policy "property_parts_delete_owner_or_super_admin"
  on public.property_parts
  for delete
  to authenticated
  using (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  );
