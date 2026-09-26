-- Indata-rikhet för cache-uppgradering (tunn analys får inte låsa rikare indata).
alter table public.analyses
  add column if not exists input_richness int not null default 0;

comment on column public.analyses.input_richness is
  'Poäng för hur rik indata var vid sparande (främst length(ad_text)). Vid cache-träff: om ny request är tydligt rikare körs Claude om och raden uppdateras.';

-- Backfill från befintliga rader (samma formel som lib/analyse/input-richness.ts).
update public.analyses
set input_richness =
  least(length(ad_text), 20000)
  + case when size_sqm > 0 then 50 else 0 end
  + case when asking_price > 0 then 50 else 0 end
where input_richness = 0;
