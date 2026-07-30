-- ============================================================================
-- Verifiering: Fastighetsprofil Etapp 1 (RLS + storage)
-- ============================================================================
-- Förberedelse (Supabase Dashboard):
-- 1. Kör migreringarna 20260717120000 → 20260717120200.
-- 2. Skapa två användare A och B (Authentication → Users).
-- 3. Bekräfta att profiles-rader skapats (trigger):
--      select id, email, app_role from public.profiles;
-- 4. Kör stegen nedan med impersonation / JWT för respektive användare
--    (SQL Editor "Run as user" eller klient med authenticated-session).
--
-- Byt ut placeholders:
--   :user_a_id, :user_b_id  – uuid från auth.users / profiles
--   :property_id            – uuid från steg 1 (spara efter INSERT)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) A skapar fastighet + egen agare-rad → OK
-- Kör som A
-- ---------------------------------------------------------------------------

-- 1a. Skapa fastighet (spara returnerat id som :property_id)
insert into public.properties (address, city, property_type)
values ('Testgatan 1', 'Stockholm', 'villa')
returning id, address;

-- 1b. Bootstrap: egen ägare-rad (ska lyckas – ingen ägare finns ännu)
insert into public.property_members (property_id, user_id, role)
values (:property_id, auth.uid(), 'agare')
returning id, role;

-- Förväntat: båda INSERT OK.

-- ---------------------------------------------------------------------------
-- 2) A läser sin fastighet → OK. B läser A:s fastighet → 0 rader
-- ---------------------------------------------------------------------------

-- Kör som A:
select id, address from public.properties where id = :property_id;
-- Förväntat: 1 rad.

-- Kör som B:
select id, address from public.properties where id = :property_id;
-- Förväntat: 0 rader.

-- ---------------------------------------------------------------------------
-- 3) B försöker INSERT:a sig själv som medlem → nekas
-- Kör som B
-- ---------------------------------------------------------------------------

insert into public.property_members (property_id, user_id, role)
values (:property_id, auth.uid(), 'medlem');
-- Förväntat: fel / 0 rader (RLS with check fail).

-- ---------------------------------------------------------------------------
-- 4) A lägger till B som gast. B kan läsa men nekas INSERT på property_events
-- ---------------------------------------------------------------------------

-- Kör som A:
insert into public.property_members (property_id, user_id, role)
values (:property_id, :user_b_id, 'gast')
returning id, role;
-- Förväntat: OK.

-- Kör som B:
select id, address from public.properties where id = :property_id;
-- Förväntat: 1 rad.

insert into public.property_events (
  property_id, event_type, event_date, description, created_by
) values (
  :property_id, 'renovering', current_date, 'Fick inte', auth.uid()
);
-- Förväntat: nekas (gast får inte INSERT).

-- ---------------------------------------------------------------------------
-- 5) A ändrar B till medlem. B kan lägga till händelse men nekas UPDATE properties
-- ---------------------------------------------------------------------------

-- Kör som A:
update public.property_members
set role = 'medlem'
where property_id = :property_id
  and user_id = :user_b_id
returning role;
-- Förväntat: role = medlem.

-- Kör som B:
insert into public.property_events (
  property_id, event_type, event_date, description, created_by
) values (
  :property_id, 'renovering', current_date, 'Byte av värmepump', auth.uid()
)
returning id;
-- Förväntat: OK.

update public.properties
set address = 'Hackad adress 99'
where id = :property_id;
-- Förväntat: nekas / 0 rader uppdaterade (medlem får inte UPDATE).

-- ---------------------------------------------------------------------------
-- 6) Storage: B som gast nekas upload; som medlem OK
-- ---------------------------------------------------------------------------
-- Görs enklast via Storage API / klient (inte ren SQL), men policies kan
-- kontrolleras så här efter att B tillfälligt satts till gast igen:
--
-- Kör som A (degradera till gast för test):
--   update public.property_members
--   set role = 'gast'
--   where property_id = :property_id and user_id = :user_b_id;
--
-- Kör som B (Storage upload till path "{property_id}/test-gast.pdf"
--   i bucket property-documents) → nekas.
--
-- Kör som A (återställ medlem):
--   update public.property_members
--   set role = 'medlem'
--   where property_id = :property_id and user_id = :user_b_id;
--
-- Kör som B (upload "{property_id}/test-medlem.pdf") → OK.
--
-- Alternativ policy-smoke i SQL (kräver att objektet skapas via API):
--   select name from storage.objects
--   where bucket_id = 'property-documents'
--     and name like :property_id || '/%';

-- ---------------------------------------------------------------------------
-- 7) A försöker ändra egen app_role till super_admin → nekas
-- Kör som A
-- ---------------------------------------------------------------------------

update public.profiles
set app_role = 'super_admin'
where id = auth.uid();
-- Förväntat: exception "Only super_admin can change app_role"

select app_role from public.profiles where id = auth.uid();
-- Förväntat: fortfarande 'user'.

-- ---------------------------------------------------------------------------
-- 8) Anonymt analysflöde fungerar fortfarande
-- ---------------------------------------------------------------------------
-- Kör via appens /api/analyse (utan inloggning), eller som service_role:
--
--   select count(*) from public.analyses;
--
-- Som anon (publishable key, utan session): SELECT ska inte ge rader via RLS.
-- INSERT/UPDATE av analyser sker via service role i API – oförändrat.
--
-- Snabbkoll att linked_property_id finns och är nullable:
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public'
--     and table_name = 'analyses'
--     and column_name in ('property_id', 'linked_property_id');
--
-- Förväntat:
--   property_id         text   YES  (befintlig cache-nyckel)
--   linked_property_id  uuid   YES  (ny FK till properties)

-- ---------------------------------------------------------------------------
-- Extra: A får inte ta bort sig själv som sista ägare
-- Kör som A
-- ---------------------------------------------------------------------------

delete from public.property_members
where property_id = :property_id
  and user_id = auth.uid();
-- Förväntat: exception "Cannot remove the last owner of a property"
