-- Logg över varje slutförd analysförfrågan (ny + cache-träff) med klient-IP.
-- Separat från analyses.client_ip (första sparande) så cache-träffar också fångas.
create table if not exists public.analysis_requests (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  client_ip text,
  cached boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.analysis_requests is
  'En rad per slutförd POST /api/analyse – både ny analys och cache-träff. client_ip sätts server-side.';
comment on column public.analysis_requests.cached is
  'true om svaret kom från befintlig cache i analyses; false om Claude kördes och rad sparades/uppdaterades.';

create index if not exists analysis_requests_analysis_id_idx
  on public.analysis_requests (analysis_id);
create index if not exists analysis_requests_created_at_idx
  on public.analysis_requests (created_at desc);

alter table public.analysis_requests enable row level security;
