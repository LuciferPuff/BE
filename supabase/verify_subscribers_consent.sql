-- Kör hela filen i Supabase → SQL Editor (Run) efter
-- supabase/migrations/20260509120000_subscribers_consent_unsubscribe.sql.
-- Alla rader ska ha status = PASS. Annars: kör migrationen igen.

with cols as (
  select column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'subscribers'
)
select 'kolumn consent_at (timestamptz, NOT NULL, default)' as check_name,
  case
    when exists (
      select 1 from cols
      where column_name = 'consent_at'
        and data_type = 'timestamp with time zone'
        and is_nullable = 'NO'
        and column_default is not null
    ) then 'PASS'
    else 'FAIL'
  end as status
union all
select 'kolumn unsubscribe_token (uuid, NOT NULL, default)',
  case
    when exists (
      select 1 from cols
      where column_name = 'unsubscribe_token'
        and data_type = 'uuid'
        and is_nullable = 'NO'
        and column_default is not null
    ) then 'PASS'
    else 'FAIL'
  end
union all
select 'kolumn unsubscribed_at (timestamptz, NULLABLE)',
  case
    when exists (
      select 1 from cols
      where column_name = 'unsubscribed_at'
        and data_type = 'timestamp with time zone'
        and is_nullable = 'YES'
    ) then 'PASS'
    else 'FAIL'
  end
union all
select 'unikt index på unsubscribe_token',
  case when exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'subscribers'
      and indexname = 'subscribers_unsubscribe_token_key'
  ) then 'PASS' else 'FAIL' end
union all
select 'funktion unsubscribe_by_token finns',
  case when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'unsubscribe_by_token'
  ) then 'PASS' else 'FAIL' end
union all
select 'funktion unsubscribe_by_token är SECURITY DEFINER',
  case when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'unsubscribe_by_token'
      and p.prosecdef = true
  ) then 'PASS' else 'FAIL' end
union all
select 'anon har EXECUTE på unsubscribe_by_token',
  case when has_function_privilege(
    'anon',
    'public.unsubscribe_by_token(uuid)',
    'EXECUTE'
  ) then 'PASS' else 'FAIL' end
union all
select 'inga befintliga rader saknar consent_at',
  case when not exists (
    select 1 from public.subscribers where consent_at is null
  ) then 'PASS' else 'FAIL' end
union all
select 'inga befintliga rader saknar unsubscribe_token',
  case when not exists (
    select 1 from public.subscribers where unsubscribe_token is null
  ) then 'PASS' else 'FAIL' end
order by check_name;
