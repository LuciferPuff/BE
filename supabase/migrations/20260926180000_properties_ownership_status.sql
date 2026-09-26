-- Fas A: köpfas vs äger på fastighetsdashboarden.
alter table public.properties
  add column if not exists ownership_status text not null default 'funderar';

alter table public.properties
  drop constraint if exists properties_ownership_status_check;

alter table public.properties
  add constraint properties_ownership_status_check
  check (ownership_status in ('funderar', 'ager'));

comment on column public.properties.ownership_status is
  'funderar = funderar på att köpa; ager = äger fastigheten. Styr dashboard-fokus.';
