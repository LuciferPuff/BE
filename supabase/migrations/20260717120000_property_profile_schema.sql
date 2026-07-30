-- Etapp 1: Fastighetsprofil – schema (enums, tabeller, triggers, index).
-- Ingen applikationskod. RLS och storage i efterföljande migreringar.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('user', 'admin', 'super_admin');
create type public.property_role as enum ('agare', 'medlem', 'gast');
create type public.property_type as enum ('villa', 'radhus', 'bostadsratt', 'fritidshus');
create type public.document_type as enum (
  'besiktningsprotokoll',
  'energideklaration',
  'ritning',
  'kvitto_renovering',
  'ovrigt'
);
create type public.event_type as enum (
  'renovering',
  'besiktning',
  'vardering',
  'skadearende',
  'driftkostnad_logg',
  'ovrigt'
);
create type public.valuation_source as enum (
  'byggello_ai',
  'maklare',
  'egen_uppskattning'
);

-- ---------------------------------------------------------------------------
-- profiles (1:1 med auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  app_role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Personlig profil, 1:1 med auth.users. Globala Byggello-roller i app_role.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Befintliga användare (skapade före triggern)
insert into public.profiles (id, full_name, email)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name'
  ),
  u.email
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- properties (ingen owner-kolumn – ägandeskap via property_members)
-- ---------------------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  postal_code text,
  city text,
  kommun text,
  property_type public.property_type,
  typkod text,
  purchase_date date,
  purchase_price numeric,
  living_area_sqm numeric,
  plot_area_sqm numeric,
  construction_year integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.properties is
  'Fastighet som eget objekt. Ägare/medlemmar ligger i property_members.';
comment on column public.properties.typkod is
  'Skatteverkets typkod, t.ex. 220.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger properties_set_updated_at
  before update on public.properties
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- property_members
-- ---------------------------------------------------------------------------

create table public.property_members (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.property_role not null,
  created_at timestamptz not null default now(),
  unique (property_id, user_id)
);

comment on table public.property_members is
  'Kopplar användare till fastighet med roll (agare / medlem / gast).';

-- ---------------------------------------------------------------------------
-- property_documents, property_events, property_valuations
-- ---------------------------------------------------------------------------

create table public.property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  type public.document_type not null,
  file_path text not null,
  note text,
  uploaded_by uuid references public.profiles (id),
  uploaded_at timestamptz not null default now()
);

comment on column public.property_documents.file_path is
  'Sökväg i storage-bucket property-documents (inte publik URL). Konvention: {property_id}/{filnamn}.';

create table public.property_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  event_type public.event_type not null,
  event_date date not null,
  description text,
  cost numeric,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.property_valuations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  estimated_value numeric not null,
  source public.valuation_source not null,
  valued_at date not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- analyses: länka till fastighetsprofil
-- OBS: analyses.property_id är redan text (Hemnet/cache-id). Ny FK heter
-- linked_property_id så det anonyma analysflödet inte påverkas.
-- ---------------------------------------------------------------------------

alter table public.analyses
  add column if not exists linked_property_id uuid
    references public.properties (id) on delete set null;

comment on column public.analyses.linked_property_id is
  'Valfri koppling till fastighetsprofil (public.properties). Skild från property_id (text, listnings-/cache-id).';

-- ---------------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------------

create index if not exists property_members_property_id_idx
  on public.property_members (property_id);
create index if not exists property_members_user_id_idx
  on public.property_members (user_id);

create index if not exists property_documents_property_id_idx
  on public.property_documents (property_id);
create index if not exists property_events_property_id_idx
  on public.property_events (property_id);
create index if not exists property_valuations_property_id_idx
  on public.property_valuations (property_id);

create index if not exists analyses_linked_property_id_idx
  on public.analyses (linked_property_id);
