-- Synka DB-default med CURRENT_PROMPT_VERSION i app/api/analyse (nu 2).
-- Befintliga rader med prompt_version = 1 är fortfarande gammal prompt-output;
-- de invalideras av API:t tills de körs om och uppdateras.

alter table public.analyses
  alter column prompt_version set default 2;
