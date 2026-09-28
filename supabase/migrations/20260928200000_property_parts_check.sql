-- Manuell kontroll-OK med giltighetstid (elbesiktning, sotning m.m.).
alter table public.property_parts
  add column if not exists checked_at date,
  add column if not exists checked_until date,
  add column if not exists check_note text;

comment on column public.property_parts.checked_at is
  'Datum då delen senast kontrollerades/godkändes (t.ex. elbesiktning).';

comment on column public.property_parts.checked_until is
  'Giltig till och med – därefter återgår status till åldersbaserad bedömning.';

comment on column public.property_parts.check_note is
  'Valfri anteckning från kontrollen (t.ex. delvis bytt).';

alter table public.property_parts
  drop constraint if exists property_parts_check_dates_order;

alter table public.property_parts
  add constraint property_parts_check_dates_order
  check (
    checked_until is null
    or checked_at is null
    or checked_until >= checked_at
  );
