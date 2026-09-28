-- Tillfälligt uppskov av påminnelse (t.ex. fönster som är gamla men inte byts nu).
alter table public.property_parts
  add column if not exists snoozed_until date;

comment on column public.property_parts.snoozed_until is
  'Påminnelse uppskjuten till och med detta datum. Åldersstatus är oförändrad.';
