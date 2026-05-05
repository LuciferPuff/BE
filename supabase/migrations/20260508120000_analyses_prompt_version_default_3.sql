-- Synka DB-default med CURRENT_PROMPT_VERSION i app/api/analyse (nu 3).

alter table public.analyses
  alter column prompt_version set default 3;
