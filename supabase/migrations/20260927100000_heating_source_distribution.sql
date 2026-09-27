-- Värmekälla + värmedistribution: variant/role/integrated, migrate uppvarmning.

-- 1) material → variant
alter table public.property_parts rename column material to variant;

comment on column public.property_parts.variant is
  'Variant/typ per del (takmaterial, värmekälla, värmedistribution m.m.).';

-- 2) role + integrated
alter table public.property_parts
  add column if not exists role text,
  add column if not exists integrated boolean not null default false;

alter table public.property_parts
  drop constraint if exists property_parts_role_check;

alter table public.property_parts
  add constraint property_parts_role_check
  check (role is null or role in ('primar', 'komplement'));

comment on column public.property_parts.role is
  'primar | komplement – används för värmekälla.';

comment on column public.property_parts.integrated is
  'true = VVB integrerad i värmepump; ingen egen status/X av Y.';

-- 3) uppvarmning → varmekalla
update public.property_parts
set
  part_key = 'varmekalla',
  role = coalesce(role, 'primar')
where part_key = 'uppvarmning';

-- 4) backfill varmedistribution på huvudbyggnad
insert into public.property_parts (property_id, building_id, part_key, not_applicable)
select b.property_id, b.id, 'varmedistribution', false
from public.property_buildings b
where b.type = 'huvudbyggnad'
  and not exists (
    select 1
    from public.property_parts p
    where p.building_id = b.id
      and p.part_key = 'varmedistribution'
  );

-- 5) ta bort oanvänd seedad värme från attefall/gäststuga (tomma rader)
delete from public.property_parts p
using public.property_buildings b
where p.building_id = b.id
  and b.type in ('attefall', 'gaststuga')
  and p.part_key = 'varmekalla'
  and p.variant is null
  and p.replaced_year is null
  and coalesce(cardinality(p.known_issues), 0) = 0;

comment on column public.property_parts.part_key is
  'Katalognyckel inkl. varmekalla, varmedistribution (ersätter uppvarmning).';
