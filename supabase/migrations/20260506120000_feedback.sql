-- Användarfeedback kopplad till sparad analys (valfritt).
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references public.analyses (id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);

comment on table public.feedback is 'Feedback på AI-analyser; skrivs endast via server-API (service role).';

alter table public.feedback enable row level security;
