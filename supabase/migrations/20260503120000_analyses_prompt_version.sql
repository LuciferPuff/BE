-- Versionsnummer för Claude-prompt; API jämför med CURRENT_PROMPT_VERSION för cache.
alter table public.analyses
  add column if not exists prompt_version int not null default 1;

comment on column public.analyses.prompt_version is 'Skall matcha CURRENT_PROMPT_VERSION i app/api/analyse vid cache-träff; höjs när prompten ändras.';
