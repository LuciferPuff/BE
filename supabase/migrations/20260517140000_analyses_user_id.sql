-- BYG-71: koppla analyser till inloggad användare (mina analyser)
alter table public.analyses
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists analyses_user_id_idx on public.analyses (user_id);

comment on column public.analyses.user_id is 'Ägare när analysen kördes inloggad; null för anonyma eller äldre rader.';
