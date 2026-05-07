-- GDPR-bevisbörda: spara samtyckes-tidpunkt och möjliggör självbetjänad avregistrering.

alter table public.subscribers
  add column if not exists consent_at timestamptz not null default now(),
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists unsubscribed_at timestamptz;

create unique index if not exists subscribers_unsubscribe_token_key
  on public.subscribers (unsubscribe_token);

comment on column public.subscribers.consent_at is
  'Tidpunkt då användaren godkände integritetspolicyn vid prenumeration.';
comment on column public.subscribers.unsubscribe_token is
  'Slumpmässigt token (UUID) som länkas i välkomstmailet och används av /avregistrera.';
comment on column public.subscribers.unsubscribed_at is
  'Sätts när prenumeranten avregistrerar sig. Null = aktiv prenumeration.';

-- SECURITY DEFINER så anon kan markera en rad som avregistrerad utan att direkt kunna
-- selecta/uppdatera tabellen. Returnerar true om ett aktivt token hittades och uppdaterades.
create or replace function public.unsubscribe_by_token(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.subscribers
     set unsubscribed_at = coalesce(unsubscribed_at, now())
   where unsubscribe_token = p_token;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.unsubscribe_by_token(uuid) from public;
grant execute on function public.unsubscribe_by_token(uuid) to anon, authenticated;
