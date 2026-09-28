-- Drop deprecated analyses table after split to analysis_results + user_analyses.
drop table if exists public.analyses_legacy cascade;
