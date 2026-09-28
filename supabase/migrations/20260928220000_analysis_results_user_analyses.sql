-- Split analyses into shared AI cache (analysis_results) + per-user rows (user_analyses).
-- Preserves analyses.id as user_analyses.id for /mina-analyser/[id] and FKs.

-- ---------------------------------------------------------------------------
-- 1. New tables
-- ---------------------------------------------------------------------------

create table public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  listing_designation text,
  input_hash text not null,
  prompt_version int not null,
  result jsonb not null,
  input_richness int not null default 0,
  address text not null,
  object_type text not null,
  build_year int not null,
  size_sqm numeric,
  asking_price bigint,
  ad_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.analysis_results is
  'Shared AI analysis cache. No owner. Keyed by listing_designation or input_hash + prompt_version.';
comment on column public.analysis_results.listing_designation is
  'Swedish cadastral designation from the form (e.g. Björkbacken 1:23). Not properties.id.';

create unique index analysis_results_designation_prompt_uidx
  on public.analysis_results (listing_designation, prompt_version)
  where listing_designation is not null;

create unique index analysis_results_hash_prompt_uidx
  on public.analysis_results (input_hash, prompt_version)
  where listing_designation is null;

create table public.user_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  anon_session_id text,
  result_id uuid not null references public.analysis_results (id) on delete restrict,
  linked_property_id uuid references public.properties (id) on delete set null,
  address text not null,
  object_type text not null,
  build_year int not null,
  created_at timestamptz not null default now()
);

comment on table public.user_analyses is
  'One row per analysis run (logged-in or anonymous). Owns quota, links, and Mina analyser URLs.';
comment on column public.user_analyses.anon_session_id is
  'HttpOnly cookie id for anonymous runs; claimed to user_id on login.';

create index user_analyses_user_id_idx
  on public.user_analyses (user_id);
create index user_analyses_anon_session_id_idx
  on public.user_analyses (anon_session_id)
  where anon_session_id is not null;
create index user_analyses_linked_property_id_idx
  on public.user_analyses (linked_property_id);
create index user_analyses_result_id_idx
  on public.user_analyses (result_id);

-- ---------------------------------------------------------------------------
-- 2. Backfill from analyses
-- ---------------------------------------------------------------------------

-- 1:1 result rows (old table already unique per cache key).
insert into public.analysis_results (
  id,
  listing_designation,
  input_hash,
  prompt_version,
  result,
  input_richness,
  address,
  object_type,
  build_year,
  size_sqm,
  asking_price,
  ad_text,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  a.property_id,
  a.input_hash,
  coalesce(a.prompt_version, 1),
  a.result,
  coalesce(a.input_richness, 0),
  a.address,
  a.object_type,
  a.build_year,
  a.size_sqm,
  a.asking_price,
  a.ad_text,
  a.created_at,
  a.created_at
from public.analyses a;

-- Map old analyses.id → new analysis_results.id via matching cache key + prompt.
create temporary table _analyses_result_map (
  old_analysis_id uuid primary key,
  result_id uuid not null
);

insert into _analyses_result_map (old_analysis_id, result_id)
select
  a.id,
  ar.id
from public.analyses a
join public.analysis_results ar
  on ar.prompt_version = coalesce(a.prompt_version, 1)
 and (
   (a.property_id is not null and ar.listing_designation is not distinct from a.property_id)
   or (a.property_id is null and ar.listing_designation is null and ar.input_hash = a.input_hash)
 );

insert into public.user_analyses (
  id,
  user_id,
  anon_session_id,
  result_id,
  linked_property_id,
  address,
  object_type,
  build_year,
  created_at
)
select
  a.id,
  a.user_id,
  null,
  m.result_id,
  a.linked_property_id,
  a.address,
  a.object_type,
  a.build_year,
  a.created_at
from public.analyses a
join _analyses_result_map m on m.old_analysis_id = a.id;

-- ---------------------------------------------------------------------------
-- 3. Retarget FKs to user_analyses
-- ---------------------------------------------------------------------------

alter table public.feedback
  drop constraint if exists feedback_analysis_id_fkey;

alter table public.feedback
  add constraint feedback_analysis_id_fkey
  foreign key (analysis_id) references public.user_analyses (id) on delete set null;

alter table public.analysis_email_requests
  drop constraint if exists analysis_email_requests_analysis_id_fkey;

alter table public.analysis_email_requests
  add constraint analysis_email_requests_analysis_id_fkey
  foreign key (analysis_id) references public.user_analyses (id) on delete cascade;

alter table public.analysis_requests
  drop constraint if exists analysis_requests_analysis_id_fkey;

alter table public.analysis_requests
  add constraint analysis_requests_analysis_id_fkey
  foreign key (analysis_id) references public.user_analyses (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

alter table public.analysis_results enable row level security;
alter table public.user_analyses enable row level security;

grant select on table public.analysis_results to authenticated;
grant select on table public.user_analyses to authenticated;

-- Drop legacy analyses SELECT policy (table becomes legacy).
drop policy if exists "analyses_select_linked_property_member_or_staff"
  on public.analyses;

create policy "user_analyses_select_own"
  on public.user_analyses
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_analyses_select_linked_member"
  on public.user_analyses
  for select
  to authenticated
  using (
    linked_property_id is not null
    and public.get_property_role(linked_property_id) is not null
  );

create policy "analysis_results_select_via_user_analysis"
  on public.analysis_results
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_analyses ua
      where ua.result_id = analysis_results.id
        and (
          ua.user_id = auth.uid()
          or (
            ua.linked_property_id is not null
            and public.get_property_role(ua.linked_property_id) is not null
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Rename legacy table (keep briefly for rollback; app must not use it)
-- ---------------------------------------------------------------------------

alter table public.analyses rename to analyses_legacy;

comment on table public.analyses_legacy is
  'Deprecated after split into analysis_results + user_analyses. Safe to drop after verify.';
