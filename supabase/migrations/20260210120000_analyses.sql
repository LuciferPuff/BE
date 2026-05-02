-- Cachade bostadsanalyser (Claude-svar). Endast server (service role) ska skriva/läsa via API.
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  property_id text,
  input_hash text not null,
  address text not null,
  object_type text not null,
  build_year int not null,
  size_sqm numeric not null,
  asking_price bigint not null,
  ad_text text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.analyses is 'Cachade AI-analyser av bostadsannonser.';

create unique index if not exists analyses_unique_property_id
  on public.analyses (property_id)
  where property_id is not null;

create unique index if not exists analyses_unique_hash_no_property
  on public.analyses (input_hash)
  where property_id is null;

alter table public.analyses enable row level security;
