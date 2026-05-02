-- Kör EN gång i Supabase → SQL Editor om verify_subscribers.sql visar FAIL på
-- created_at eller policies. Säkert att köra om: droppar och återskapar policies.

-- 1) Säkerställ kolumn created_at (default + NOT NULL)
alter table public.subscribers
  alter column created_at set default now();

update public.subscribers
set created_at = now()
where created_at is null;

alter table public.subscribers
  alter column created_at set not null;

-- 2) RLS + rättigheter för anon (API med publishable-nyckel)
alter table public.subscribers enable row level security;

grant usage on schema public to anon;
grant insert on table public.subscribers to anon;

-- 3) Policies (idempotent)
drop policy if exists "subscribers_insert_anon" on public.subscribers;
drop policy if exists "subscribers_select_denied_anon" on public.subscribers;

create policy "subscribers_insert_anon"
  on public.subscribers
  for insert
  to anon
  with check (true);

-- Blockera läsning för anon (tom resultatmängd)
create policy "subscribers_select_denied_anon"
  on public.subscribers
  for select
  to anon
  using (false);
