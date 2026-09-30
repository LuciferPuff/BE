-- Fas G: one-roundtrip admin aggregates (avoids 15× PostgREST calls).

create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_week timestamptz := now() - interval '7 days';
  v_month timestamptz := now() - interval '30 days';
  v_interest jsonb;
begin
  if public.get_app_role() is distinct from 'admin'::public.app_role
     and public.get_app_role() is distinct from 'super_admin'::public.app_role then
    raise exception 'Only admin or super_admin can read admin stats';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('feature', f.feature, 'count', f.cnt)
      order by f.cnt desc
    ),
    '[]'::jsonb
  )
  into v_interest
  from (
    select feature, count(*)::int as cnt
    from public.feature_interest
    group by feature
  ) f;

  return jsonb_build_object(
    'profilesTotal', (select count(*)::int from public.profiles),
    'profilesLast7Days', (
      select count(*)::int from public.profiles where created_at >= v_week
    ),
    'profilesLast30Days', (
      select count(*)::int from public.profiles where created_at >= v_month
    ),
    'propertiesTotal', (select count(*)::int from public.properties),
    'propertiesLast7Days', (
      select count(*)::int from public.properties where created_at >= v_week
    ),
    'propertiesLast30Days', (
      select count(*)::int from public.properties where created_at >= v_month
    ),
    'analysisRunsTotal', (select count(*)::int from public.user_analyses),
    'analysisRunsLast7Days', (
      select count(*)::int from public.user_analyses where created_at >= v_week
    ),
    'analysisCacheTotal', (select count(*)::int from public.analysis_results),
    'propertiesWithVerifiedParts', (
      select count(distinct property_id)::int
      from public.property_parts
      where replaced_year is not null
    ),
    'propertiesWithDocuments', (
      select count(distinct property_id)::int from public.property_documents
    ),
    'propertiesWithLinkedAnalysis', (
      select count(distinct linked_property_id)::int
      from public.user_analyses
      where linked_property_id is not null
    ),
    'propertiesShared', (
      select count(*)::int
      from (
        select property_id
        from public.property_members
        group by property_id
        having count(*) > 1
      ) s
    ),
    'subscribersTotal', (select count(*)::int from public.subscribers),
    'featureInterest', v_interest,
    'fetchedAt', to_jsonb(now())
  );
end;
$$;

comment on function public.get_admin_dashboard_stats() is
  'Aggregate Byggello status metrics for staff admin dashboard.';

revoke all on function public.get_admin_dashboard_stats() from public;
grant execute on function public.get_admin_dashboard_stats() to authenticated;
