-- Komplementbyggnader: friggebod + fritext "annat"
alter type public.building_type add value if not exists 'friggebod';
alter type public.building_type add value if not exists 'annat';
