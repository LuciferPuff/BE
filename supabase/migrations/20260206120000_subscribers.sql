-- Prenumeranter (nyhetsbrev). Kör i Supabase SQL Editor eller via `supabase db push`.
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  constraint subscribers_email_unique unique (email)
);

comment on table public.subscribers is 'E-postadresser som anmält intresse via startsidan.';

alter table public.subscribers enable row level security;

grant usage on schema public to anon;
grant insert on table public.subscribers to anon;

-- Tillåt anonyma inserts (anropas från Next.js API med publishable key).
-- Läsning blockeras för anon (dataskydd).
create policy "subscribers_insert_anon"
  on public.subscribers
  for insert
  to anon
  with check (true);

create policy "subscribers_select_denied_anon"
  on public.subscribers
  for select
  to anon
  using (false);
