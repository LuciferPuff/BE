-- Fas C+/status: precision, material och kända problem på husdelar.
alter table public.property_parts
  add column if not exists year_precision text,
  add column if not exists material text,
  add column if not exists known_issues text[] not null default '{}';

comment on column public.property_parts.year_precision is
  'exact | decade | original. Null = ingen verifiering / vet ej.';

comment on column public.property_parts.material is
  'Främst tak: tegel | betong | plat_band | plat_profil | papp | eternit | okand.';

comment on column public.property_parts.known_issues is
  'Kodade kända problem, t.ex. lackage, fuktflackar, mossa.';

alter table public.property_parts
  drop constraint if exists property_parts_year_precision_check;

alter table public.property_parts
  add constraint property_parts_year_precision_check
  check (
    year_precision is null
    or year_precision in ('exact', 'decade', 'original')
  );

alter table public.property_parts
  drop constraint if exists property_parts_replaced_year_check;

alter table public.property_parts
  add constraint property_parts_replaced_year_check
  check (
    replaced_year is null
    or (replaced_year >= 1850 and replaced_year <= 2100)
  );
