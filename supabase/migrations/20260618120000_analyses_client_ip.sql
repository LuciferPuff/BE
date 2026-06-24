-- Klient-IP vid första (ocachade) sparande av analysen. Sätts server-side från
-- x-forwarded-for / x-real-ip; påverkar varken cache-nyckel eller prompt_version.
alter table public.analyses
  add column if not exists client_ip text;

comment on column public.analyses.client_ip is 'Klient-IP vid första sparande av analysen (server-side). Null om okänd eller äldre rader.';
