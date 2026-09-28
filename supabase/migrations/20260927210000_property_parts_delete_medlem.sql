-- Tillåt medlem att ta bort husdelar (samma som insert/update).
drop policy if exists "property_parts_delete_owner_or_super_admin"
  on public.property_parts;

create policy "property_parts_delete_agare_medlem_or_super_admin"
  on public.property_parts
  for delete
  to authenticated
  using (
    public.get_property_role(property_id) in ('agare', 'medlem')
    or public.get_app_role() = 'super_admin'
  );
