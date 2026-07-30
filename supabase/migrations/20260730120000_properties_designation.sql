-- Fastighetsbeteckning på properties (unik identifierare).

alter table public.properties
  add column designation text;

-- Befintliga rader får tillfällig unik placeholder
update public.properties
set designation = 'SAKNAS-' || id::text
where designation is null;

alter table public.properties
  alter column designation set not null;

create unique index properties_designation_unique
  on public.properties (designation);

comment on column public.properties.designation is
  'Fastighetsbeteckning, t.ex. Björkbacken 1:23.';
