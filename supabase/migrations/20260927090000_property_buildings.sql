-- Fas A+B: byggnader + flera delinstanser + "finns inte".
-- Varje fastighet får en Huvudbyggnad; antaget byggår ligger på byggnaden.

create type public.building_type as enum (
  'huvudbyggnad',
  'tillbyggnad',
  'garage',
  'attefall',
  'uthus',
  'gaststuga'
);

create table public.property_buildings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  type public.building_type not null,
  name text not null,
  build_year integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_buildings_build_year_check
    check (
      build_year is null
      or (build_year >= 1800 and build_year <= 2100)
    ),
  constraint property_buildings_name_check
    check (char_length(trim(name)) > 0)
);

comment on table public.property_buildings is
  'Byggnader på fastigheten. Antaget byggår för husdelar hämtas härifrån.';

comment on column public.property_buildings.build_year is
  'Byggår för denna byggnad. Speglas till properties.construction_year för huvudbyggnad.';

create unique index property_buildings_one_huvudbyggnad_idx
  on public.property_buildings (property_id)
  where type = 'huvudbyggnad';

create index property_buildings_property_id_idx
  on public.property_buildings (property_id);

-- Backfill: en huvudbyggnad per befintlig fastighet
insert into public.property_buildings (property_id, type, name, build_year)
select
  p.id,
  'huvudbyggnad'::public.building_type,
  'Huvudbyggnad',
  case
    when p.construction_year is not null
      and p.construction_year >= 1800
      and p.construction_year <= 2100
    then p.construction_year
    else null
  end
from public.properties p;

-- property_parts: byggnadskoppling, namn, finns-inte
alter table public.property_parts
  add column if not exists building_id uuid references public.property_buildings (id) on delete cascade,
  add column if not exists name text,
  add column if not exists not_applicable boolean not null default false;

comment on column public.property_parts.building_id is
  'Byggnad som delen tillhör.';

comment on column public.property_parts.name is
  'Visningsnamn vid flera instanser (t.ex. Övre badrum). Null = katalogetikett.';

comment on column public.property_parts.not_applicable is
  'true = finns inte / ej relevant. Räknas bort från komplett-% och nästa steg.';

-- Koppla befintliga delar till huvudbyggnaden
update public.property_parts pp
set building_id = b.id
from public.property_buildings b
where b.property_id = pp.property_id
  and b.type = 'huvudbyggnad'
  and pp.building_id is null;

alter table public.property_parts
  alter column building_id set not null;

alter table public.property_parts
  drop constraint if exists property_parts_property_id_part_key_key;

-- Seed saknade standarddelar för huvudbyggnad (inkl. varmvattenberedare)
insert into public.property_parts (property_id, building_id, part_key, not_applicable)
select
  b.property_id,
  b.id,
  k.part_key,
  false
from public.property_buildings b
cross join (
  values
    ('tak'),
    ('fasad'),
    ('fonster'),
    ('dranering'),
    ('grund'),
    ('badrum'),
    ('uppvarmning'),
    ('varmvattenberedare'),
    ('ventilation'),
    ('el'),
    ('va')
) as k(part_key)
where b.type = 'huvudbyggnad'
  and not exists (
    select 1
    from public.property_parts p
    where p.building_id = b.id
      and p.part_key = k.part_key
  );

create index if not exists property_parts_building_id_idx
  on public.property_parts (building_id);

-- RLS buildings
alter table public.property_buildings enable row level security;

grant select, insert, update, delete on table public.property_buildings to authenticated;

create policy "property_buildings_select_member_or_staff"
  on public.property_buildings
  for select
  to authenticated
  using (
    public.get_property_role(property_id) is not null
    or public.get_app_role() in ('admin', 'super_admin')
  );

create policy "property_buildings_insert_agare_medlem_or_super_admin"
  on public.property_buildings
  for insert
  to authenticated
  with check (
    public.get_property_role(property_id) in ('agare', 'medlem')
    or public.get_app_role() = 'super_admin'
  );

create policy "property_buildings_update_agare_medlem_or_super_admin"
  on public.property_buildings
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

create policy "property_buildings_delete_owner_or_super_admin"
  on public.property_buildings
  for delete
  to authenticated
  using (
    public.get_property_role(property_id) = 'agare'
    or public.get_app_role() = 'super_admin'
  );
