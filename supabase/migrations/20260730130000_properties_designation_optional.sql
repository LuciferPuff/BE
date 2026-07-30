-- designation: frivillig, ej unik (unikhet/matchning kommer i claim/överföring).

drop index if exists public.properties_designation_unique;

alter table public.properties
  alter column designation drop not null;

-- Placeholder från NOT NULL-backfill → null
update public.properties
set designation = null
where designation like 'SAKNAS-%';

comment on column public.properties.designation is
  'Valfri fastighetsbeteckning. Unikhet/matchning kommer i claim/överföring.';
