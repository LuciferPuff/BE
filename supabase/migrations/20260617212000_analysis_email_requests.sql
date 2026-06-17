-- BYG-97: logg över "mejla mig analysen"-händelser (transaktionellt, knutet till
-- analysen). Separat från `subscribers` (marknadsföringssamtycke) och från
-- `analyses` (delad cache – får inte få per-användarfält). Möjliggör i Fas 2 att
-- knyta mejlade analyser till en fastighetsprofil via analysis_id -> property_id.
create table if not exists public.analysis_email_requests (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  email text not null,
  subscribed boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.analysis_email_requests is
  'En rad per gång en analys mejlats till en adress. subscribed = användaren kryssade även i prenumeration (sanningskällan för prenumeranter är ändå public.subscribers).';
comment on column public.analysis_email_requests.subscribed is
  'Ögonblicksbild: kryssade användaren i tips-rutan vid utskicket. Avregistrering hanteras i public.subscribers.';

create index if not exists analysis_email_requests_analysis_id_idx
  on public.analysis_email_requests (analysis_id);
create index if not exists analysis_email_requests_email_idx
  on public.analysis_email_requests (email);

-- Endast server (service role) skriver/läser. Inga anon-policies (som public.analyses).
alter table public.analysis_email_requests enable row level security;
