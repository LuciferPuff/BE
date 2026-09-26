-- Feature-intresse ("Meddela mig") – per användare, inte husets tidslinje.
create table if not exists public.feature_interest (
  user_id uuid not null references public.profiles (id) on delete cascade,
  feature text not null,
  property_id uuid null references public.properties (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, feature)
);

comment on table public.feature_interest is
  'Användarens intresse för kommande funktioner (dokument, ekonomi, …). PK ger visa-inte-igen.';

comment on column public.feature_interest.feature is
  'Funktionsnyckel, t.ex. dokument | ekonomi.';

comment on column public.feature_interest.property_id is
  'Valfri kontext (vilken fastighet klicket skedde ifrån). Ingår inte i PK.';

create index if not exists feature_interest_feature_idx
  on public.feature_interest (feature);

alter table public.feature_interest enable row level security;

grant select, insert, delete on table public.feature_interest to authenticated;

create policy "feature_interest_select_own"
  on public.feature_interest
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "feature_interest_insert_own"
  on public.feature_interest
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "feature_interest_delete_own"
  on public.feature_interest
  for delete
  to authenticated
  using (auth.uid() = user_id);
