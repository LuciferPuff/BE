-- Etapp 1: Fastighetsprofil – privat storage-bucket + policies.
-- Filväg: {property_id}/{filnamn}. Visning sker via signed URLs (senare etapp).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-documents',
  'property-documents',
  false,
  52428800, -- 50 MB
  null
)
on conflict (id) do update
set public = excluded.public;

-- SELECT: medlem på fastigheten (valfri roll), eller admin/super_admin
create policy "property_documents_storage_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'property-documents'
    and (
      public.get_property_role((storage.foldername(name))[1]::uuid) is not null
      or public.get_app_role() in ('admin', 'super_admin')
    )
  );

-- INSERT: agare eller medlem på fastigheten i sökvägen, eller super_admin
create policy "property_documents_storage_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'property-documents'
    and (
      public.get_property_role((storage.foldername(name))[1]::uuid) in ('agare', 'medlem')
      or public.get_app_role() = 'super_admin'
    )
  );

-- DELETE: agare på fastigheten, eller super_admin
create policy "property_documents_storage_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'property-documents'
    and (
      public.get_property_role((storage.foldername(name))[1]::uuid) = 'agare'
      or public.get_app_role() = 'super_admin'
    )
  );
