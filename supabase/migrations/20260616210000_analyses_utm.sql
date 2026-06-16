-- BYG-74: UTM-spårning – vilken kampanj/annons ledde till analysen.
-- Kolumnerna är nullable. Gamla rader förblir tomma, nya fylls i.
-- Påverkar varken cache-nyckeln (input_hash) eller prompt_version.
alter table public.analyses
  add column if not exists utm_source text;
alter table public.analyses
  add column if not exists utm_medium text;
alter table public.analyses
  add column if not exists utm_campaign text;

comment on column public.analyses.utm_source is 'UTM-källa från URL vid första (ocachade) analysen; "direkt" om saknas. Otillförlitlig användarindata – visa aldrig oescapad.';
comment on column public.analyses.utm_medium is 'UTM-medium från URL vid första (ocachade) analysen; null om saknas.';
comment on column public.analyses.utm_campaign is 'UTM-kampanj från URL vid första (ocachade) analysen; null om saknas.';
