# Fastighetsprofil (Supabase)

Etapp 1 av 4: schema, RLS och storage. Ingen frontend eller API i denna etapp.

Migreringar (kör i ordning):

1. `migrations/20260717120000_property_profile_schema.sql`
2. `migrations/20260717120100_property_profile_rls.sql`
3. `migrations/20260717120200_property_profile_storage.sql`
4. `migrations/20260730120000_properties_designation.sql`

## `properties.designation`

Fastighetsbeteckning (t.ex. `Björkbacken 1:23`). **Obligatorisk** och **unik** globalt. Det är den identifierande nyckeln för en fastighet i profilen (skild från `analyses.property_id` som är listnings-/cache-id).

## Rollmodell

### Globala roller (`profiles.app_role`)

| Roll | Betydelse |
|------|-----------|
| `user` | Standard. Endast egna/tilldelade fastigheter. |
| `admin` | Kan **läsa** alla fastigheter och tillhörande data. |
| `super_admin` | Kan **läsa och ändra** allt. Endast denna roll får ändra `app_role`. |

Ändring av egen `app_role` blockeras av trigger (`profiles_guard_app_role`).

### Fastighetsroller (`property_members.role`)

Ägandeskap är en **rad i `property_members`**, inte en kolumn på `properties`. Överlåtelse blir en radändring; historik följer fastigheten.

| Roll | Läsa | Skapa händelser/dokument/värderingar | Uppdatera/radera fastighet & metadata | Hantera medlemmar |
|------|------|--------------------------------------|----------------------------------------|-------------------|
| `agare` | ja | ja | ja | ja |
| `medlem` | ja | ja | nej | nej |
| `gast` | ja | nej | nej | nej |

**Skapandeflöde:** inloggad användare INSERT:ar `properties`, sedan sin egen `property_members`-rad med `role = 'agare'`. Det är tillåtet endast om fastigheten ännu saknar ägare (bootstrap). Sista ägaren får inte tas bort eller degraderas.

### `analyses.linked_property_id`

Befintliga `analyses.property_id` (`text`) är listnings-/cache-id (t.ex. Hemnet) och **rörs inte**. Koppling till fastighetsprofil sker via nya kolumnen `linked_property_id` → `properties(id)`.

Rader utan `linked_property_id` har samma beteende som tidigare: RLS utan anon-policies, skriv/läs via service role i API:t. Anonymt analysflöde påverkas inte.

## Storage

- Bucket: `property-documents` (**privat**, `public = false`)
- Filväg: `{property_id}/{filnamn}` — första mappnivån måste vara fastighetens UUID (RLS matchar mot den)
- Metadata i `property_documents.file_path` (sökväg, inte publik URL)
- Visning i frontend: signed URLs (senare etapp)

## Verifiering

Se `verify_property_profile.sql` för SQL att köra som testanvändare A och B efter att migreringarna körts.
