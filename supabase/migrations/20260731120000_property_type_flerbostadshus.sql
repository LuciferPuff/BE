-- Lägg till flerbostadshus i property_type-enum.
alter type public.property_type add value if not exists 'flerbostadshus';
