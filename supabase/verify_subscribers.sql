-- Kör hela filen i Supabase → SQL Editor (Run).
-- Alla rader ska ha status = PASS. Annars: kör supabase/migrations/20260206120000_subscribers.sql igen.

with cols as (
  select column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'subscribers'
)
select 'kolumn id (uuid, PK)' as check_name,
  case
    when exists (
      select 1 from cols
      where column_name = 'id' and data_type = 'uuid' and is_nullable = 'NO'
    ) then 'PASS'
    else 'FAIL'
  end as status
union all
select 'kolumn email (text, NOT NULL)',
  case
    when exists (
      select 1 from cols
      where column_name = 'email' and data_type = 'text' and is_nullable = 'NO'
    ) then 'PASS'
    else 'FAIL'
  end
union all
select 'kolumn created_at (timestamptz, default)',
  case
    when exists (
      select 1 from cols c
      where c.column_name = 'created_at'
        and c.data_type = 'timestamp with time zone'
        and c.is_nullable = 'NO'
        and (
          c.column_default is not null
          or exists (
            select 1
            from pg_attribute a
            join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
            where a.attrelid = 'public.subscribers'::regclass
              and a.attname = 'created_at'
              and a.attnum > 0
              and not a.attisdropped
              and pg_get_expr(d.adbin, d.adrelid) is not null
          )
        )
    ) then 'PASS'
    else 'FAIL'
  end
union all
select 'exakt 3 kolumner',
  case (select count(*)::int from cols)
    when 3 then 'PASS'
    else 'FAIL — hittade ' || (select count(*)::text from cols) || ' kolumner'
  end
union all
select 'unik constraint på email',
  case when exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscribers'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%email%'
  ) then 'PASS' else 'FAIL' end
union all
select 'primary key',
  case when exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscribers'::regclass
      and contype = 'p'
  ) then 'PASS' else 'FAIL' end
union all
select 'RLS påslaget',
  case when exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'subscribers'
      and c.relrowsecurity = true
  ) then 'PASS' else 'FAIL' end
union all
select 'policy subscribers_insert_anon',
  case when exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscribers'
      and policyname = 'subscribers_insert_anon'
  ) then 'PASS' else 'FAIL' end
union all
select 'policy subscribers_select_denied_anon',
  case when exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscribers'
      and policyname = 'subscribers_select_denied_anon'
  ) then 'PASS' else 'FAIL' end
order by check_name;
