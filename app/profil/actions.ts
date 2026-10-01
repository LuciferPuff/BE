"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { parseSwedishMunicipality } from "@/lib/geo/swedish-municipalities";
import {
  isOwnershipStatus,
  isPropertyRole,
  isPropertyType,
  type OwnershipStatus,
  type PropertyRole,
  type PropertyType,
} from "@/lib/properties/labels";
import {
  isDocumentType,
  isEventType,
  sanitizeFileName,
} from "@/lib/properties/document-labels";
import {
  MAX_DOCUMENTS_PER_PROPERTY,
} from "@/lib/properties/dashboard-limits";
import {
  loadMoreAnalysesPage,
  loadMoreDocumentsPage,
  loadMoreTimelinePage,
} from "@/lib/properties/load-dashboard-pages";
import type {
  DashboardDocument,
  DashboardLinkedAnalysis,
  DashboardTimelineItem,
} from "@/lib/properties/get-property-dashboard";
import {
  BUILDING_TYPE_LABELS,
  getPartDefinition,
  isComplementBuildingType,
  isPartRole,
  isPropertyPartKey,
  partAllowsMultiple,
} from "@/lib/properties/parts-catalog";
import {
  createBuildingWithDefaultParts,
  syncHuvudbyggnadBuildYear,
} from "@/lib/properties/ensure-buildings";
import {
  FACADE_KNOWN_ISSUES,
  FOUNDATION_KNOWN_ISSUES,
  addYearsToDate,
  isFacadeType,
  isFoundationType,
  isHeatDistVariant,
  isHeatSourceVariant,
  isRoofMaterial,
  isVentilationType,
  partCheckConfig,
  ROOF_KNOWN_ISSUES,
  VENTILATION_KNOWN_ISSUES,
} from "@/lib/properties/component-lifespans";
import {
  MAX_NOTE_LENGTH,
  MAX_NOTES,
  parseTodoNotes,
  serializeTodoNotes,
} from "@/lib/properties/todo-notes";
import { createAuthClient } from "@/lib/supabase/auth-client";

export type PropertyFormState = {
  error?: string;
};

function optionalText(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

function parsePropertyFields(formData: FormData): {
  error?: string;
  address?: string;
  designation: string | null;
  postal_code: string | null;
  city: string | null;
  kommun: string | null;
  property_type: PropertyType | null;
  construction_year: number | null;
  living_area_sqm: number | null;
} {
  const address = optionalText(formData, "address");
  if (!address) {
    return {
      error: "Ange en adress.",
      designation: null,
      postal_code: null,
      city: null,
      kommun: null,
      property_type: null,
      construction_year: null,
      living_area_sqm: null,
    };
  }

  const rawKommun = optionalText(formData, "kommun");
  if (!rawKommun) {
    return {
      error: "Välj kommun.",
      designation: null,
      postal_code: null,
      city: null,
      kommun: null,
      property_type: null,
      construction_year: null,
      living_area_sqm: null,
    };
  }
  const kommun = parseSwedishMunicipality(rawKommun);
  if (!kommun) {
    return {
      error: "Välj en kommun från listan.",
      designation: null,
      postal_code: null,
      city: null,
      kommun: null,
      property_type: null,
      construction_year: null,
      living_area_sqm: null,
    };
  }

  const rawType = optionalText(formData, "property_type");
  let property_type: PropertyType | null = null;
  if (rawType) {
    if (!isPropertyType(rawType)) {
      return {
        error: "Ogiltig fastighetstyp.",
        designation: null,
        postal_code: null,
        city: null,
        kommun: null,
        property_type: null,
        construction_year: null,
        living_area_sqm: null,
      };
    }
    property_type = rawType;
  }

  const yearRaw = optionalText(formData, "construction_year");
  let construction_year: number | null = null;
  if (yearRaw) {
    const year = Number.parseInt(yearRaw, 10);
    const maxYear = new Date().getFullYear() + 1;
    if (!Number.isFinite(year) || year < 1800 || year > maxYear) {
      return {
        error: "Ange ett rimligt byggår.",
        designation: null,
        postal_code: null,
        city: null,
        kommun: null,
        property_type: null,
        construction_year: null,
        living_area_sqm: null,
      };
    }
    construction_year = year;
  }

  const areaRaw = optionalText(formData, "living_area_sqm");
  let living_area_sqm: number | null = null;
  if (areaRaw) {
    const area = Number.parseFloat(areaRaw.replace(",", "."));
    if (!Number.isFinite(area) || area <= 0 || area > 5000) {
      return {
        error: "Ange en rimlig boarea i m².",
        designation: null,
        postal_code: null,
        city: null,
        kommun: null,
        property_type: null,
        construction_year: null,
        living_area_sqm: null,
      };
    }
    living_area_sqm = area;
  }

  return {
    address,
    designation: optionalText(formData, "designation"),
    postal_code: optionalText(formData, "postal_code"),
    city: optionalText(formData, "city"),
    kommun,
    property_type,
    construction_year,
    living_area_sqm,
  };
}

export async function createPropertyAction(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/logga-in?next=/profil/ny");
  }

  const parsed = parsePropertyFields(formData);
  if (parsed.error || !parsed.address) {
    return { error: parsed.error ?? "Ange en adress." };
  }

  const supabase = await createAuthClient();

  // Generera id i appen: INSERT … RETURNING/.select() kräver SELECT-RLS,
  // men skaparen är ännu inte medlem (agare-rad kommer i steg 2).
  const propertyId = crypto.randomUUID();

  const { error: insertError } = await supabase.from("properties").insert({
    id: propertyId,
    address: parsed.address,
    designation: parsed.designation,
    postal_code: parsed.postal_code,
    city: parsed.city,
    kommun: parsed.kommun,
    property_type: parsed.property_type,
    construction_year: parsed.construction_year,
    living_area_sqm: parsed.living_area_sqm,
  });

  if (insertError) {
    console.error(
      "[profil] create property:",
      insertError.message,
      insertError.code,
    );
    return { error: "Kunde inte skapa fastigheten. Försök igen." };
  }

  const { error: memberError } = await supabase.from("property_members").insert({
    property_id: propertyId,
    user_id: user.id,
    role: "agare",
  });

  if (memberError) {
    console.error(
      "[profil] create member:",
      memberError.message,
      memberError.code,
    );
    const { error: rollbackError } = await supabase
      .from("properties")
      .delete()
      .eq("id", propertyId);
    if (rollbackError) {
      console.error(
        "[profil] rollback orphan property failed:",
        rollbackError.message,
        propertyId,
      );
    }
    return {
      error: "Kunde inte koppla dig som ägare. Försök igen.",
    };
  }

  const buildingResult = await createBuildingWithDefaultParts(supabase, {
    propertyId,
    type: "huvudbyggnad",
    name: "Huvudbyggnad",
    buildYear: parsed.construction_year,
  });
  if (buildingResult.error) {
    console.error("[profil] create huvudbyggnad:", buildingResult.error);
    // Fastigheten finns – användaren kan fortsätta; seed kan fixas manuellt
  }

  revalidatePath("/profil");
  revalidatePath(`/profil/${propertyId}`);
  redirect(`/profil/${propertyId}`);
}

export async function updatePropertyAction(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}/redigera`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId) {
    return { error: "Saknar fastighet." };
  }

  const parsed = parsePropertyFields(formData);
  if (parsed.error || !parsed.address) {
    return { error: parsed.error ?? "Ange en adress." };
  }

  const supabase = await createAuthClient();

  const { data, error } = await supabase
    .from("properties")
    .update({
      address: parsed.address,
      designation: parsed.designation,
      postal_code: parsed.postal_code,
      city: parsed.city,
      kommun: parsed.kommun,
      property_type: parsed.property_type,
      construction_year: parsed.construction_year,
      living_area_sqm: parsed.living_area_sqm,
    })
    .eq("id", propertyId)
    .select("id");

  if (error) {
    console.error("[profil] update property:", error.message, error.code);
    return { error: "Kunde inte spara ändringarna. Försök igen." };
  }

  // 0 rader = RLS nekade (t.ex. inte ägare) eller fel id
  if (!data || data.length === 0) {
    return {
      error: "Du har inte behörighet att ändra den här fastigheten.",
    };
  }

  const syncError = await syncHuvudbyggnadBuildYear(
    supabase,
    propertyId,
    parsed.construction_year,
  );
  if (syncError) {
    console.error("[profil] sync year after property update:", syncError);
  }

  revalidatePath("/profil");
  revalidatePath(`/profil/${propertyId}/redigera`);
  revalidatePath(`/profil/${propertyId}`);
  redirect(`/profil/${propertyId}`);
}

export type OwnershipStatusState = {
  error?: string;
};

/** Uppdaterar köpfas / äger på dashboarden. Endast ägare. */
export async function updateOwnershipStatusAction(
  _prev: OwnershipStatusState,
  formData: FormData,
): Promise<OwnershipStatusState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const rawStatus = optionalText(formData, "ownership_status");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId) {
    return { error: "Saknar fastighet." };
  }
  if (!rawStatus || !isOwnershipStatus(rawStatus)) {
    return { error: "Ogiltig status." };
  }
  const ownership_status: OwnershipStatus = rawStatus;

  const supabase = await createAuthClient();

  const patch: Record<string, unknown> = { ownership_status };
  if (ownership_status === "ager") {
    const { data: current } = await supabase
      .from("properties")
      .select("purchase_date")
      .eq("id", propertyId)
      .maybeSingle();
    if (!current?.purchase_date) {
      patch.purchase_date = new Date().toISOString().slice(0, 10);
    }
  }

  const { data, error } = await supabase
    .from("properties")
    .update(patch)
    .eq("id", propertyId)
    .select("id");

  if (error) {
    console.error("[profil] ownership_status:", error.message, error.code);
    return { error: "Kunde inte uppdatera status. Försök igen." };
  }
  if (!data || data.length === 0) {
    return {
      error: "Du har inte behörighet att ändra den här fastigheten.",
    };
  }

  revalidatePath("/profil");
  revalidatePath(`/profil/${propertyId}`);
  return {};
}

/** Fas C: tydlig CTA från köpfas → äger. */
export async function markBoughtHouseAction(
  _prev: OwnershipStatusState,
  formData: FormData,
): Promise<OwnershipStatusState> {
  const next = new FormData();
  const propertyId = formData.get("property_id");
  if (typeof propertyId === "string") {
    next.set("property_id", propertyId);
  }
  next.set("ownership_status", "ager");
  return updateOwnershipStatusAction(_prev, next);
}

export type UpdateTodoState = {
  error?: string;
  ok?: boolean;
};

export type FeatureInterestState = {
  error?: string;
  ok?: boolean;
};

const FEATURE_KEYS = new Set(["dokument", "ekonomi"]);

/** Anmäl intresse för kommande funktion (visa-inte-igen via PK). */
export async function registerFeatureInterestAction(
  _prev: FeatureInterestState,
  formData: FormData,
): Promise<FeatureInterestState> {
  const user = await getSessionUser();
  const feature = optionalText(formData, "feature");
  const propertyId = optionalText(formData, "property_id");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!feature || !FEATURE_KEYS.has(feature)) {
    return { error: "Ogiltig funktion." };
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.from("feature_interest").upsert(
    {
      user_id: user.id,
      feature,
      property_id: propertyId,
    },
    { onConflict: "user_id,feature", ignoreDuplicates: true },
  );

  if (error) {
    console.error("[profil] feature_interest:", error.message, error.code);
    return { error: "Kunde inte spara. Försök igen." };
  }

  if (propertyId) {
    revalidatePath(`/profil/${propertyId}`);
  }
  return { ok: true };
}

/** Bockar av / ångrar Att göra-punkt, lägger till eller tar bort anteckning. */
export async function updateTodoStateAction(
  _prev: UpdateTodoState,
  formData: FormData,
): Promise<UpdateTodoState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const taskKey = optionalText(formData, "task_key");
  const noteOp = optionalText(formData, "note_op") ?? "toggle";
  const completed = optionalText(formData, "completed") === "1";

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !taskKey) {
    return { error: "Saknar uppgift." };
  }
  if (taskKey === "verify_parts" || taskKey.startsWith("part_")) {
    return { error: "Den här punkten bockas av automatiskt." };
  }
  if (taskKey.length > 80) {
    return { error: "Ogiltig uppgift." };
  }
  if (noteOp !== "toggle" && noteOp !== "add" && noteOp !== "remove") {
    return { error: "Ogiltig åtgärd." };
  }

  const supabase = await createAuthClient();

  const { data: existing, error: readError } = await supabase
    .from("property_todo_states")
    .select("note, completed_at")
    .eq("property_id", propertyId)
    .eq("task_key", taskKey)
    .maybeSingle();

  if (readError) {
    console.error("[profil] todo_states read:", readError.message);
    return { error: "Kunde inte spara. Försök igen." };
  }

  let notes = parseTodoNotes(existing?.note ?? null);
  const completedAt = completed
    ? ((existing?.completed_at as string | null) ?? new Date().toISOString())
    : null;

  if (noteOp === "add") {
    const text = optionalText(formData, "note_text");
    if (!text) {
      return { error: "Skriv en anteckning först." };
    }
    if (text.length > MAX_NOTE_LENGTH) {
      return { error: `Max ${MAX_NOTE_LENGTH} tecken.` };
    }
    if (notes.length >= MAX_NOTES) {
      return { error: `Max ${MAX_NOTES} anteckningar per punkt.` };
    }
    notes = [
      ...notes,
      {
        id: crypto.randomUUID(),
        text,
        createdAt: new Date().toISOString(),
      },
    ];
  } else if (noteOp === "remove") {
    const noteId = optionalText(formData, "note_id");
    if (!noteId) {
      return { error: "Saknar anteckning." };
    }
    notes = notes.filter((n) => n.id !== noteId);
  }

  const { error } = await supabase.from("property_todo_states").upsert(
    {
      property_id: propertyId,
      task_key: taskKey,
      completed_at: completedAt,
      note: serializeTodoNotes(notes),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "property_id,task_key" },
  );

  if (error) {
    console.error("[profil] todo_states:", error.message, error.code);
    return { error: "Kunde inte spara. Försök igen." };
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}

export type UpdatePropertyPartState = {
  error?: string;
  ok?: boolean;
};

/** Sparar husdel: precision, år, variant och kända problem. */
export async function updatePropertyPartAction(
  _prev: UpdatePropertyPartState,
  formData: FormData,
): Promise<UpdatePropertyPartState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const partId = optionalText(formData, "part_id");
  const clear = optionalText(formData, "clear") === "1";
  const precisionRaw = optionalText(formData, "year_precision");
  const yearRaw = optionalText(formData, "replaced_year");
  const decadeRaw = optionalText(formData, "decade");
  const variantRaw =
    optionalText(formData, "variant") ?? optionalText(formData, "material");
  const nameRaw = optionalText(formData, "name");
  const roleRaw = optionalText(formData, "role");
  const integrated = optionalText(formData, "integrated") === "1";
  const knownIssues = formData
    .getAll("known_issues")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !partId) {
    return { error: "Saknar husdel." };
  }

  const supabase = await createAuthClient();
  const { data: existing, error: readError } = await supabase
    .from("property_parts")
    .select("id, part_key, building_id, name, role")
    .eq("id", partId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (readError || !existing) {
    return { error: "Husdelen hittades inte." };
  }

  const partKey = existing.part_key as string;
  if (!isPropertyPartKey(partKey)) {
    return { error: "Ogiltig husdel." };
  }

  const allowedIssues = new Set(
    partKey === "tak"
      ? ROOF_KNOWN_ISSUES.map((i) => i.key as string)
      : partKey === "grund"
        ? FOUNDATION_KNOWN_ISSUES.map((i) => i.key as string)
        : partKey === "ventilation"
          ? VENTILATION_KNOWN_ISSUES.map((i) => i.key as string)
          : partKey === "fasad"
            ? FACADE_KNOWN_ISSUES.map((i) => i.key as string)
            : [],
  );
  const known_issues =
    partKey === "tak" ||
    partKey === "grund" ||
    partKey === "ventilation" ||
    partKey === "fasad"
      ? knownIssues.filter((k) => allowedIssues.has(k)).slice(0, 10)
      : [];

  let variant: string | null = null;
  if (partKey === "tak") {
    if (!variantRaw || !isRoofMaterial(variantRaw)) {
      if (!clear) {
        return { error: "Välj takmaterial." };
      }
    } else {
      variant = variantRaw;
    }
  } else if (partKey === "grund") {
    if (!variantRaw || !isFoundationType(variantRaw)) {
      if (!clear && precisionRaw !== "unknown") {
        return { error: "Välj typ av grund." };
      }
    } else {
      variant = variantRaw;
    }
  } else if (partKey === "ventilation") {
    if (!variantRaw || !isVentilationType(variantRaw)) {
      if (!clear && precisionRaw !== "unknown") {
        return { error: "Välj typ av ventilation." };
      }
    } else {
      variant = variantRaw;
    }
  } else if (partKey === "fasad") {
    if (!variantRaw || !isFacadeType(variantRaw)) {
      if (!clear && precisionRaw !== "unknown") {
        return { error: "Välj fasadmaterial." };
      }
    } else {
      variant = variantRaw;
    }
  } else if (partKey === "varmekalla") {
    if (!variantRaw || !isHeatSourceVariant(variantRaw)) {
      if (!clear && precisionRaw !== "unknown") {
        return { error: "Välj värmekälla." };
      }
    } else {
      variant = variantRaw;
    }
  } else if (partKey === "varmedistribution") {
    if (!variantRaw || !isHeatDistVariant(variantRaw)) {
      if (!clear && precisionRaw !== "unknown") {
        return { error: "Välj värmedistribution." };
      }
    } else {
      variant = variantRaw;
    }
  }

  let role: string | null = null;
  if (partKey === "varmekalla") {
    role =
      roleRaw && isPartRole(roleRaw)
        ? roleRaw
        : ((existing.role as string | null) ?? "primar");
  }

  let name: string | null;
  if (partKey === "fasad") {
    if (variant === "annat") {
      const raw = nameRaw?.trim().slice(0, 80) || null;
      name = raw ?? ((existing.name as string | null) || null);
    } else {
      name = null;
    }
  } else {
    name =
      nameRaw != null && nameRaw.trim()
        ? nameRaw.trim().slice(0, 80)
        : (existing.name as string | null);
  }

  const integratedValue =
    partKey === "varmvattenberedare" ? integrated : false;

  if (clear || precisionRaw === "unknown") {
    const { error } = await supabase
      .from("property_parts")
      .update({
        replaced_year: null,
        year_precision: null,
        variant:
          partKey === "tak" ||
          partKey === "grund" ||
          partKey === "ventilation" ||
          partKey === "fasad" ||
          partKey === "varmekalla" ||
          partKey === "varmedistribution"
            ? variant
            : null,
        known_issues,
        name,
        role,
        integrated: integratedValue,
        not_applicable: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partId)
      .eq("property_id", propertyId);
    if (error) {
      console.error("[profil] property_parts:", error.message, error.code);
      return { error: "Kunde inte spara. Försök igen." };
    }
    revalidatePath(`/profil/${propertyId}`);
    return { ok: true };
  }

  // Integrerad VVB: ingen ålder krävs
  if (partKey === "varmvattenberedare" && integratedValue) {
    const { error } = await supabase
      .from("property_parts")
      .update({
        replaced_year: null,
        year_precision: null,
        variant: null,
        known_issues: [],
        name,
        integrated: true,
        not_applicable: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partId)
      .eq("property_id", propertyId);
    if (error) {
      console.error("[profil] property_parts:", error.message, error.code);
      return { error: "Kunde inte spara. Försök igen." };
    }
    revalidatePath(`/profil/${propertyId}`);
    return { ok: true };
  }

  // Värmekälla/kamin/luftburen: tillåt spara bara variant utan år
  if (
    (partKey === "varmekalla" && variant === "kamin") ||
    (partKey === "varmedistribution" && variant === "luftburen")
  ) {
    if (!yearRaw && precisionRaw !== "decade" && precisionRaw !== "original") {
      const { error } = await supabase
        .from("property_parts")
        .update({
          replaced_year: null,
          year_precision: null,
          variant,
          known_issues,
          name,
          role,
          integrated: false,
          not_applicable: false,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", partId)
        .eq("property_id", propertyId);
      if (error) {
        console.error("[profil] property_parts:", error.message, error.code);
        return { error: "Kunde inte spara. Försök igen." };
      }
      revalidatePath(`/profil/${propertyId}`);
      return { ok: true };
    }
  }

  // Värmekälla: tillåt spara bara variant (år optional → unknown status)
  if (partKey === "varmekalla" && variant && !yearRaw && !decadeRaw && precisionRaw !== "original" && precisionRaw !== "decade" && precisionRaw !== "exact") {
    const { error } = await supabase
      .from("property_parts")
      .update({
        replaced_year: null,
        year_precision: null,
        variant,
        known_issues,
        name,
        role,
        not_applicable: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partId)
      .eq("property_id", propertyId);
    if (error) {
      console.error("[profil] property_parts:", error.message, error.code);
      return { error: "Kunde inte spara. Försök igen." };
    }
    revalidatePath(`/profil/${propertyId}`);
    return { ok: true };
  }

  // Grund: tillåt spara bara typ (år optional)
  if (
    partKey === "grund" &&
    variant &&
    !yearRaw &&
    !decadeRaw &&
    precisionRaw !== "original" &&
    precisionRaw !== "decade" &&
    precisionRaw !== "exact"
  ) {
    const { error } = await supabase
      .from("property_parts")
      .update({
        replaced_year: null,
        year_precision: null,
        variant,
        known_issues,
        name,
        not_applicable: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partId)
      .eq("property_id", propertyId);
    if (error) {
      console.error("[profil] property_parts:", error.message, error.code);
      return { error: "Kunde inte spara. Försök igen." };
    }
    revalidatePath(`/profil/${propertyId}`);
    return { ok: true };
  }

  // Ventilation: tillåt spara bara typ (år optional)
  if (
    partKey === "ventilation" &&
    variant &&
    !yearRaw &&
    !decadeRaw &&
    precisionRaw !== "original" &&
    precisionRaw !== "decade" &&
    precisionRaw !== "exact"
  ) {
    const { error } = await supabase
      .from("property_parts")
      .update({
        replaced_year: null,
        year_precision: null,
        variant,
        known_issues,
        name,
        not_applicable: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partId)
      .eq("property_id", propertyId);
    if (error) {
      console.error("[profil] property_parts:", error.message, error.code);
      return { error: "Kunde inte spara. Försök igen." };
    }
    revalidatePath(`/profil/${propertyId}`);
    return { ok: true };
  }

  // Fasad: tillåt spara bara material (år optional)
  if (
    partKey === "fasad" &&
    variant &&
    !yearRaw &&
    !decadeRaw &&
    precisionRaw !== "original" &&
    precisionRaw !== "decade" &&
    precisionRaw !== "exact"
  ) {
    const { error } = await supabase
      .from("property_parts")
      .update({
        replaced_year: null,
        year_precision: null,
        variant,
        known_issues,
        name,
        not_applicable: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partId)
      .eq("property_id", propertyId);
    if (error) {
      console.error("[profil] property_parts:", error.message, error.code);
      return { error: "Kunde inte spara. Försök igen." };
    }
    revalidatePath(`/profil/${propertyId}`);
    return { ok: true };
  }

  // Distribution: tillåt spara bara variant
  if (
    partKey === "varmedistribution" &&
    variant &&
    !yearRaw &&
    !decadeRaw &&
    precisionRaw !== "original" &&
    precisionRaw !== "decade" &&
    precisionRaw !== "exact"
  ) {
    const { error } = await supabase
      .from("property_parts")
      .update({
        replaced_year: null,
        year_precision: null,
        variant,
        known_issues,
        name,
        not_applicable: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partId)
      .eq("property_id", propertyId);
    if (error) {
      console.error("[profil] property_parts:", error.message, error.code);
      return { error: "Kunde inte spara. Försök igen." };
    }
    revalidatePath(`/profil/${propertyId}`);
    return { ok: true };
  }

  let year_precision: "exact" | "decade" | "original" | null = null;
  let replaced_year: number | null = null;
  const maxYear = new Date().getFullYear();
  const minYear = 1850;

  if (precisionRaw === "original") {
    const { data: building } = await supabase
      .from("property_buildings")
      .select("build_year")
      .eq("id", existing.building_id as string)
      .maybeSingle();
    const buildYear =
      building?.build_year != null ? Number(building.build_year) : null;
    if (buildYear == null || !Number.isFinite(buildYear)) {
      return { error: "Ange byggår på byggnaden först." };
    }
    year_precision = "original";
    replaced_year = buildYear;
  } else if (precisionRaw === "decade") {
    if (!decadeRaw) {
      return { error: "Välj årtionde." };
    }
    const decadeStart = Number.parseInt(decadeRaw, 10);
    if (
      !Number.isFinite(decadeStart) ||
      decadeStart < 1950 ||
      decadeStart > maxYear
    ) {
      return { error: "Ogiltigt årtionde." };
    }
    year_precision = "decade";
    replaced_year = decadeStart + 5;
  } else if (precisionRaw === "exact" || !precisionRaw) {
    if (!yearRaw) {
      return { error: "Ange år då delen byttes eller renoverades." };
    }
    const year = Number.parseInt(yearRaw, 10);
    if (!Number.isFinite(year) || year < minYear || year > maxYear) {
      return { error: `Ange ett år mellan ${minYear} och ${maxYear}.` };
    }
    year_precision = "exact";
    replaced_year = year;
  } else {
    return { error: "Välj hur du vet åldern." };
  }

  const { error } = await supabase
    .from("property_parts")
    .update({
      replaced_year,
      year_precision,
      variant:
        partKey === "tak" ||
        partKey === "grund" ||
        partKey === "ventilation" ||
        partKey === "fasad" ||
        partKey === "varmekalla" ||
        partKey === "varmedistribution"
          ? variant
          : null,
      known_issues,
      name,
      role,
      integrated: integratedValue,
      not_applicable: false,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", partId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("[profil] property_parts:", error.message, error.code);
    return { error: "Kunde inte spara. Försök igen." };
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}

/** Markera del som finns inte / återställ. */
export async function setPartNotApplicableAction(
  _prev: UpdatePropertyPartState,
  formData: FormData,
): Promise<UpdatePropertyPartState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const partId = optionalText(formData, "part_id");
  const notApplicable = optionalText(formData, "not_applicable") === "1";

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !partId) {
    return { error: "Saknar husdel." };
  }

  const supabase = await createAuthClient();
  const patch = notApplicable
    ? {
        not_applicable: true,
        replaced_year: null,
        year_precision: null,
        variant: null,
        known_issues: [] as string[],
        integrated: false,
        checked_at: null,
        checked_until: null,
        check_note: null,
        snoozed_until: null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }
    : {
        not_applicable: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

  const { error } = await supabase
    .from("property_parts")
    .update(patch)
    .eq("id", partId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("[profil] part N/A:", error.message, error.code);
    return { error: "Kunde inte uppdatera delen." };
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}

/** Markera del som kontrollerad/OK med giltighetstid. */
export async function setPartCheckedAction(
  _prev: UpdatePropertyPartState,
  formData: FormData,
): Promise<UpdatePropertyPartState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const partId = optionalText(formData, "part_id");
  const clear = optionalText(formData, "clear") === "1";
  const checkedAtRaw = optionalText(formData, "checked_at");
  const noteRaw = optionalText(formData, "check_note");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !partId) {
    return { error: "Saknar husdel." };
  }

  const supabase = await createAuthClient();
  const { data: existing, error: readError } = await supabase
    .from("property_parts")
    .select("id, part_key")
    .eq("id", partId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (readError || !existing) {
    return { error: "Husdelen hittades inte." };
  }

  const partKey = existing.part_key as string;
  if (!isPropertyPartKey(partKey)) {
    return { error: "Ogiltig husdel." };
  }

  const cfg = partCheckConfig(partKey);
  if (!cfg) {
    return { error: "Den här delen har ingen kontroll." };
  }

  if (clear) {
    const { error } = await supabase
      .from("property_parts")
      .update({
        checked_at: null,
        checked_until: null,
        check_note: null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partId)
      .eq("property_id", propertyId);
    if (error) {
      console.error("[profil] clear check:", error.message, error.code);
      return { error: "Kunde inte rensa kontrollen." };
    }
    revalidatePath(`/profil/${propertyId}`);
    return { ok: true };
  }

  const today = new Date().toISOString().slice(0, 10);
  const checkedAt =
    checkedAtRaw && /^\d{4}-\d{2}-\d{2}$/.test(checkedAtRaw)
      ? checkedAtRaw
      : today;
  const checkedUntil = addYearsToDate(checkedAt, cfg.intervalYears);
  const checkNote = noteRaw?.trim().slice(0, 300) || null;

  const { error } = await supabase
    .from("property_parts")
    .update({
      checked_at: checkedAt,
      checked_until: checkedUntil,
      check_note: checkNote,
      snoozed_until: null,
      not_applicable: false,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", partId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("[profil] set check:", error.message, error.code);
    return { error: "Kunde inte spara kontrollen." };
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}

const SNOOZE_YEARS = [1, 2, 3] as const;

/** Skjut upp påminnelse 1–3 år (behovet finns kvar, slutar pocka). */
export async function setPartSnoozedAction(
  _prev: UpdatePropertyPartState,
  formData: FormData,
): Promise<UpdatePropertyPartState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const partId = optionalText(formData, "part_id");
  const clear = optionalText(formData, "clear") === "1";
  const yearsRaw = optionalText(formData, "snooze_years");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !partId) {
    return { error: "Saknar husdel." };
  }

  const supabase = await createAuthClient();
  const { data: existing, error: readError } = await supabase
    .from("property_parts")
    .select("id, part_key, variant")
    .eq("id", partId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (readError || !existing) {
    return { error: "Husdelen hittades inte." };
  }

  const partKey = existing.part_key as string;
  if (!isPropertyPartKey(partKey)) {
    return { error: "Ogiltig husdel." };
  }

  const variant = (existing.variant as string | null)?.trim() || null;
  if (
    (partKey === "tak" || partKey === "fasad") &&
    variant === "eternit"
  ) {
    return { error: "Eternit kan inte skjutas upp – hanteras av behörig firma." };
  }

  if (clear) {
    const { error } = await supabase
      .from("property_parts")
      .update({
        snoozed_until: null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partId)
      .eq("property_id", propertyId);
    if (error) {
      console.error("[profil] clear snooze:", error.message, error.code);
      return { error: "Kunde inte ta bort uppskovet." };
    }
    revalidatePath(`/profil/${propertyId}`);
    return { ok: true };
  }

  const years = yearsRaw ? Number.parseInt(yearsRaw, 10) : NaN;
  if (!(SNOOZE_YEARS as readonly number[]).includes(years)) {
    return { error: "Välj 1, 2 eller 3 år." };
  }

  const today = new Date().toISOString().slice(0, 10);
  const snoozedUntil = addYearsToDate(today, years);

  const { error } = await supabase
    .from("property_parts")
    .update({
      snoozed_until: snoozedUntil,
      not_applicable: false,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", partId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("[profil] set snooze:", error.message, error.code);
    return { error: "Kunde inte skjuta upp påminnelsen." };
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}

/** Ta bort en husdel helt. */
export async function deletePropertyPartAction(
  _prev: UpdatePropertyPartState,
  formData: FormData,
): Promise<UpdatePropertyPartState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const partId = optionalText(formData, "part_id");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !partId) {
    return { error: "Saknar husdel." };
  }

  const supabase = await createAuthClient();
  const { error } = await supabase
    .from("property_parts")
    .delete()
    .eq("id", partId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("[profil] delete part:", error.message, error.code);
    return { error: "Kunde inte ta bort delen." };
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}

/** Lägg till del på en byggnad (multi eller saknad katalogdel). */
export async function addPropertyPartAction(
  _prev: UpdatePropertyPartState,
  formData: FormData,
): Promise<UpdatePropertyPartState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const buildingId = optionalText(formData, "building_id");
  const partKey = optionalText(formData, "part_key");
  const nameRaw = optionalText(formData, "name");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !buildingId) {
    return { error: "Saknar byggnad." };
  }
  if (!partKey || !isPropertyPartKey(partKey)) {
    return { error: "Ogiltig husdel." };
  }

  const supabase = await createAuthClient();
  const { data: building } = await supabase
    .from("property_buildings")
    .select("id")
    .eq("id", buildingId)
    .eq("property_id", propertyId)
    .maybeSingle();
  if (!building) {
    return { error: "Byggnaden hittades inte." };
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("property_parts")
    .select("id")
    .eq("building_id", buildingId)
    .eq("part_key", partKey);

  if (existingError) {
    console.error("[profil] add part read:", existingError.message);
    return { error: "Kunde inte lägga till delen." };
  }

  const count = existingRows?.length ?? 0;
  if (!partAllowsMultiple(partKey) && count > 0) {
    return { error: "Den här delen finns redan på byggnaden." };
  }

  const nextIndex = count + 1;
  const def = getPartDefinition(partKey);
  const finalName =
    nameRaw?.trim().slice(0, 80) ||
    (partAllowsMultiple(partKey) && nextIndex > 1 && def
      ? `${def.label} ${nextIndex}`
      : null);

  const role =
    partKey === "varmekalla"
      ? count > 0
        ? "komplement"
        : "primar"
      : null;

  const { error } = await supabase.from("property_parts").insert({
    property_id: propertyId,
    building_id: buildingId,
    part_key: partKey,
    name: finalName,
    not_applicable: false,
    role,
    updated_by: user.id,
  });

  if (error) {
    console.error("[profil] add part:", error.message, error.code);
    return { error: "Kunde inte lägga till delen." };
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}

const DOC_BUCKET = "property-documents";
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export type DocumentUploadPrepareState = {
  error?: string;
  path?: string;
  token?: string;
  signedUrl?: string;
};

/** Skapar signed upload-URL. Klienten laddar upp, sedan confirmDocumentUploadAction. */
export async function prepareDocumentUploadAction(
  _prev: DocumentUploadPrepareState,
  formData: FormData,
): Promise<DocumentUploadPrepareState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const fileName = optionalText(formData, "file_name");
  const fileSizeRaw = optionalText(formData, "file_size");
  const typeRaw = optionalText(formData, "type");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !fileName) {
    return { error: "Saknar fil eller fastighet." };
  }
  if (!typeRaw || !isDocumentType(typeRaw)) {
    return { error: "Välj mapp." };
  }
  const fileSize = fileSizeRaw ? Number(fileSizeRaw) : 0;
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return { error: "Ogiltig filstorlek." };
  }
  if (fileSize > MAX_UPLOAD_BYTES) {
    return { error: "Filen får vara högst 50 MB." };
  }

  const supabase = await createAuthClient();
  const { count, error: countError } = await supabase
    .from("property_documents")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  if (countError) {
    console.error("[profil] document count:", countError.message);
    return { error: "Kunde inte kontrollera dokumentkvot. Försök igen." };
  }
  if ((count ?? 0) >= MAX_DOCUMENTS_PER_PROPERTY) {
    return {
      error: `Du kan ha högst ${MAX_DOCUMENTS_PER_PROPERTY} dokument per fastighet. Ta bort något innan du laddar upp fler.`,
    };
  }

  const safe = sanitizeFileName(fileName);
  const path = `${propertyId}/${typeRaw}/${crypto.randomUUID()}-${safe}`;

  const { data, error } = await supabase.storage
    .from(DOC_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("[profil] signed upload:", error?.message);
    return { error: "Kunde inte förbereda uppladdning. Försök igen." };
  }

  return {
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
  };
}

export type DocumentActionState = {
  error?: string;
  ok?: boolean;
  url?: string;
};

/** Sparar metadata efter lyckad storage-uppladdning. */
export async function confirmDocumentUploadAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const path = optionalText(formData, "file_path");
  const typeRaw = optionalText(formData, "type");
  const note = optionalText(formData, "note");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !path) {
    return { error: "Saknar fil." };
  }
  if (!path.startsWith(`${propertyId}/`)) {
    return { error: "Ogiltig filsökväg." };
  }
  if (!typeRaw || !isDocumentType(typeRaw)) {
    return { error: "Välj dokumenttyp." };
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.from("property_documents").insert({
    property_id: propertyId,
    type: typeRaw,
    file_path: path,
    note,
    uploaded_by: user.id,
  });

  if (error) {
    console.error("[profil] documents insert:", error.message, error.code);
    return { error: "Kunde inte spara dokumentet. Försök igen." };
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}

/** Signed download-URL (kortlivad). */
export async function getDocumentDownloadUrlAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const documentId = optionalText(formData, "document_id");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !documentId) {
    return { error: "Saknar dokument." };
  }

  const supabase = await createAuthClient();
  const { data: doc, error: readError } = await supabase
    .from("property_documents")
    .select("file_path")
    .eq("id", documentId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (readError || !doc) {
    return { error: "Dokumentet hittades inte." };
  }

  const { data, error } = await supabase.storage
    .from(DOC_BUCKET)
    .createSignedUrl(doc.file_path as string, 60 * 10);

  if (error || !data?.signedUrl) {
    console.error("[profil] signed download:", error?.message);
    return { error: "Kunde inte öppna filen." };
  }

  return { ok: true, url: data.signedUrl };
}

/** Flyttar dokument till annan mapp (ägare) – uppdaterar type. */
export async function moveDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const documentId = optionalText(formData, "document_id");
  const typeRaw = optionalText(formData, "type");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !documentId) {
    return { error: "Saknar dokument." };
  }
  if (!typeRaw || !isDocumentType(typeRaw)) {
    return { error: "Välj mapp." };
  }

  const supabase = await createAuthClient();
  const { data: doc, error: readError } = await supabase
    .from("property_documents")
    .select("id, type")
    .eq("id", documentId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (readError || !doc) {
    return { error: "Dokumentet hittades inte." };
  }
  if (doc.type === typeRaw) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("property_documents")
    .update({ type: typeRaw })
    .eq("id", documentId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("[profil] documents move:", error.message, error.code);
    return { error: "Kunde inte flytta dokumentet." };
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}

/** Tar bort dokument (ägare) – storage + rad. */
export async function deleteDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const documentId = optionalText(formData, "document_id");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !documentId) {
    return { error: "Saknar dokument." };
  }

  const supabase = await createAuthClient();
  const { data: doc, error: readError } = await supabase
    .from("property_documents")
    .select("file_path")
    .eq("id", documentId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (readError || !doc) {
    return { error: "Dokumentet hittades inte." };
  }

  const { error: storageError } = await supabase.storage
    .from(DOC_BUCKET)
    .remove([doc.file_path as string]);

  if (storageError) {
    console.error("[profil] storage delete:", storageError.message);
  }

  const { error } = await supabase
    .from("property_documents")
    .delete()
    .eq("id", documentId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("[profil] documents delete:", error.message, error.code);
    return { error: "Kunde inte ta bort dokumentet." };
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}

export type EventActionState = {
  error?: string;
  ok?: boolean;
};

/** Lägger till händelse i tidslinjen. */
export async function createPropertyEventAction(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const typeRaw = optionalText(formData, "event_type");
  const dateRaw = optionalText(formData, "event_date");
  const description = optionalText(formData, "description");
  const costRaw = optionalText(formData, "cost");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId) {
    return { error: "Saknar fastighet." };
  }
  if (!typeRaw || !isEventType(typeRaw)) {
    return { error: "Välj typ av händelse." };
  }
  if (!dateRaw || !/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    return { error: "Ange ett giltigt datum." };
  }

  let cost: number | null = null;
  if (costRaw) {
    const parsed = Number(costRaw.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { error: "Ogiltig kostnad." };
    }
    cost = parsed;
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.from("property_events").insert({
    property_id: propertyId,
    event_type: typeRaw,
    event_date: dateRaw,
    description,
    cost,
    created_by: user.id,
  });

  if (error) {
    console.error("[profil] events insert:", error.message, error.code);
    return { error: "Kunde inte spara händelsen." };
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}

export async function deletePropertyEventAction(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const eventId = optionalText(formData, "event_id");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !eventId) {
    return { error: "Saknar händelse." };
  }

  const supabase = await createAuthClient();
  const { error } = await supabase
    .from("property_events")
    .delete()
    .eq("id", eventId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("[profil] events delete:", error.message, error.code);
    return { error: "Kunde inte ta bort händelsen." };
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}

/** @deprecated Use PropertyFormState */
export type CreatePropertyState = PropertyFormState;

export type LoadMoreAnalysesResult = {
  error?: string;
  items?: DashboardLinkedAnalysis[];
  hasMore?: boolean;
};

export async function loadMoreAnalysesAction(
  propertyId: string,
  offset: number,
): Promise<LoadMoreAnalysesResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Du måste vara inloggad." };
  if (!propertyId || offset < 0) return { error: "Ogiltig begäran." };

  const page = await loadMoreAnalysesPage(propertyId, user.id, offset);
  if (!page) return { error: "Ingen åtkomst." };
  return { items: page.items, hasMore: page.hasMore };
}

export type LoadMoreDocumentsResult = {
  error?: string;
  items?: DashboardDocument[];
  hasMore?: boolean;
};

export async function loadMoreDocumentsAction(
  propertyId: string,
  offset: number,
): Promise<LoadMoreDocumentsResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Du måste vara inloggad." };
  if (!propertyId || offset < 0) return { error: "Ogiltig begäran." };

  const page = await loadMoreDocumentsPage(propertyId, user.id, offset);
  if (!page) return { error: "Ingen åtkomst." };
  return { items: page.items, hasMore: page.hasMore };
}

export type LoadMoreTimelineResult = {
  error?: string;
  items?: DashboardTimelineItem[];
  hasMore?: boolean;
  nextOffsets?: { analyses: number; documents: number; events: number };
};

export async function loadMoreTimelineAction(
  propertyId: string,
  offsets: { analyses: number; documents: number; events: number },
  knownKeys: string[],
  createdAt: string,
): Promise<LoadMoreTimelineResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Du måste vara inloggad." };
  if (!propertyId || !createdAt) return { error: "Ogiltig begäran." };

  const page = await loadMoreTimelinePage(
    propertyId,
    user.id,
    offsets,
    knownKeys,
    createdAt,
  );
  if (!page) return { error: "Ingen åtkomst." };
  return {
    items: page.items,
    hasMore: page.hasMore,
    nextOffsets: page.nextOffsets,
  };
}

export type PropertyMemberAccessState = {
  error?: string;
  ok?: boolean;
};

async function assertPropertyOwner(
  propertyId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("property_members")
    .select("role")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[profil] assertPropertyOwner:", error.message);
    return { ok: false, error: "Kunde inte kontrollera behörighet." };
  }
  if (!data || data.role !== "agare") {
    return {
      ok: false,
      error: "Bara ägare kan ändra vem som har tillgång.",
    };
  }
  return { ok: true };
}

function mapMemberWriteError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("last owner") || lower.includes("sista")) {
    return "Du kan inte ta bort eller degradera den sista ägaren.";
  }
  if (
    lower.includes("duplicate") ||
    lower.includes("unique") ||
    lower.includes("23505")
  ) {
    return "Personen har redan tillgång till fastigheten.";
  }
  return "Kunde inte uppdatera åtkomst. Försök igen.";
}

/** Fas F: lägg till befintligt Byggello-konto som medlem/gäst/ägare. */
export async function addPropertyMemberAction(
  _prev: PropertyMemberAccessState,
  formData: FormData,
): Promise<PropertyMemberAccessState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const emailRaw = optionalText(formData, "email");
  const roleRaw = optionalText(formData, "role") ?? "gast";

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId) return { error: "Saknar fastighet." };
  if (!emailRaw) return { error: "Ange en e-postadress." };
  if (!isPropertyRole(roleRaw)) return { error: "Ogiltig roll." };
  const role: PropertyRole = roleRaw;

  const owner = await assertPropertyOwner(propertyId, user.id);
  if (!owner.ok) return { error: owner.error };

  const supabase = await createAuthClient();
  const { data: profileId, error: lookupError } = await supabase.rpc(
    "find_profile_id_by_email_for_owner",
    {
      p_property_id: propertyId,
      p_email: emailRaw,
    },
  );

  if (lookupError) {
    console.error("[profil] find_profile_id:", lookupError.message);
    return { error: "Kunde inte söka efter användaren." };
  }
  if (!profileId || typeof profileId !== "string") {
    return {
      error:
        "Ingen användare med den e-posten. Personen måste ha ett Byggello-konto först.",
    };
  }
  if (profileId === user.id && role === "agare") {
    return { error: "Du är redan ägare." };
  }

  const { error } = await supabase.from("property_members").insert({
    property_id: propertyId,
    user_id: profileId,
    role,
  });

  if (error) {
    console.error("[profil] addPropertyMember:", error.message, error.code);
    return { error: mapMemberWriteError(error.message) };
  }

  revalidatePath(`/profil/${propertyId}`);
  revalidatePath("/profil");
  return { ok: true };
}

/** Fas F: ändra roll för en medlem. */
export async function updatePropertyMemberRoleAction(
  _prev: PropertyMemberAccessState,
  formData: FormData,
): Promise<PropertyMemberAccessState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const memberId = optionalText(formData, "member_id");
  const roleRaw = optionalText(formData, "role");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !memberId) return { error: "Ogiltig begäran." };
  if (!roleRaw || !isPropertyRole(roleRaw)) return { error: "Ogiltig roll." };
  const role: PropertyRole = roleRaw;

  const owner = await assertPropertyOwner(propertyId, user.id);
  if (!owner.ok) return { error: owner.error };

  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("property_members")
    .update({ role })
    .eq("id", memberId)
    .eq("property_id", propertyId)
    .select("id");

  if (error) {
    console.error("[profil] updatePropertyMemberRole:", error.message);
    return { error: mapMemberWriteError(error.message) };
  }
  if (!data || data.length === 0) {
    return { error: "Kunde inte hitta personen på fastigheten." };
  }

  revalidatePath(`/profil/${propertyId}`);
  revalidatePath("/profil");
  return { ok: true };
}

/** Fas F: ta bort någons åtkomst. */
export async function removePropertyMemberAction(
  _prev: PropertyMemberAccessState,
  formData: FormData,
): Promise<PropertyMemberAccessState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const memberId = optionalText(formData, "member_id");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !memberId) return { error: "Ogiltig begäran." };

  const owner = await assertPropertyOwner(propertyId, user.id);
  if (!owner.ok) return { error: owner.error };

  const supabase = await createAuthClient();
  const { data: target } = await supabase
    .from("property_members")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (!target) {
    return { error: "Kunde inte hitta personen på fastigheten." };
  }

  const { error } = await supabase
    .from("property_members")
    .delete()
    .eq("id", memberId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("[profil] removePropertyMember:", error.message);
    return { error: mapMemberWriteError(error.message) };
  }

  revalidatePath(`/profil/${propertyId}`);
  revalidatePath("/profil");

  if (target.user_id === user.id) {
    redirect("/profil");
  }

  return { ok: true };
}

/**
 * Fas F: överlåt ägarskap till en annan member.
 * Mottagaren blir agare; du blir medlem (behåller tillgång, förlorar styrning).
 */
export async function transferPropertyOwnershipAction(
  _prev: PropertyMemberAccessState,
  formData: FormData,
): Promise<PropertyMemberAccessState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const memberId = optionalText(formData, "member_id");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !memberId) return { error: "Ogiltig begäran." };

  const owner = await assertPropertyOwner(propertyId, user.id);
  if (!owner.ok) return { error: owner.error };

  const supabase = await createAuthClient();
  const { data: target } = await supabase
    .from("property_members")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (!target) {
    return { error: "Kunde inte hitta personen på fastigheten." };
  }
  if (target.user_id === user.id) {
    return { error: "Du kan inte överlåta ägarskapet till dig själv." };
  }

  // Promote first so demoting yourself never hits the last-owner guard.
  if (target.role !== "agare") {
    const { error: promoteError } = await supabase
      .from("property_members")
      .update({ role: "agare" })
      .eq("id", target.id)
      .eq("property_id", propertyId);

    if (promoteError) {
      console.error(
        "[profil] transferOwnership promote:",
        promoteError.message,
      );
      return { error: mapMemberWriteError(promoteError.message) };
    }
  }

  const { data: selfRow } = await supabase
    .from("property_members")
    .select("id")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!selfRow) {
    return { error: "Kunde inte hitta din medlemsrad." };
  }

  const { error: demoteError } = await supabase
    .from("property_members")
    .update({ role: "medlem" })
    .eq("id", selfRow.id)
    .eq("property_id", propertyId);

  if (demoteError) {
    console.error("[profil] transferOwnership demote:", demoteError.message);
    return { error: mapMemberWriteError(demoteError.message) };
  }

  revalidatePath(`/profil/${propertyId}`);
  revalidatePath("/profil");
  return { ok: true };
}

export type PropertyBuildingState = {
  error?: string;
  ok?: boolean;
};

function parseBuildYear(raw: string | null): number | null | { error: string } {
  if (raw == null || raw.trim() === "") return null;
  const year = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(year) || year < 1800 || year > 2100) {
    return { error: "Ange ett giltigt byggår (1800–2100)." };
  }
  return year;
}

/** Lägg till komplementbyggnad (garage, attefall, …) med standarddelar. */
export async function addPropertyBuildingAction(
  _prev: PropertyBuildingState,
  formData: FormData,
): Promise<PropertyBuildingState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const typeRaw = optionalText(formData, "building_type");
  const nameRaw = optionalText(formData, "name");
  const yearRaw = optionalText(formData, "build_year");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId) return { error: "Saknar fastighet." };
  if (!typeRaw || !isComplementBuildingType(typeRaw)) {
    return { error: "Välj typ av byggnad." };
  }

  const yearParsed = parseBuildYear(yearRaw);
  if (yearParsed && typeof yearParsed === "object" && "error" in yearParsed) {
    return { error: yearParsed.error };
  }
  const buildYear = yearParsed as number | null;

  const supabase = await createAuthClient();

  let name = nameRaw?.trim().slice(0, 80) || "";
  if (!name) {
    const label = BUILDING_TYPE_LABELS[typeRaw];
    const { count } = await supabase
      .from("property_buildings")
      .select("*", { count: "exact", head: true })
      .eq("property_id", propertyId)
      .eq("type", typeRaw);
    const n = count ?? 0;
    name = n > 0 ? `${label} ${n + 1}` : label;
  }

  const result = await createBuildingWithDefaultParts(supabase, {
    propertyId,
    type: typeRaw,
    name,
    buildYear,
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}

/** Uppdatera namn/byggår på en byggnad. */
export async function updatePropertyBuildingAction(
  _prev: PropertyBuildingState,
  formData: FormData,
): Promise<PropertyBuildingState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const buildingId = optionalText(formData, "building_id");
  const nameRaw = optionalText(formData, "name");
  const yearRaw = optionalText(formData, "build_year");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !buildingId) return { error: "Ogiltig begäran." };
  if (!nameRaw?.trim()) return { error: "Ange ett namn." };

  const yearParsed = parseBuildYear(yearRaw);
  if (yearParsed && typeof yearParsed === "object" && "error" in yearParsed) {
    return { error: yearParsed.error };
  }
  const buildYear = yearParsed as number | null;

  const supabase = await createAuthClient();
  const { data: building } = await supabase
    .from("property_buildings")
    .select("id, type")
    .eq("id", buildingId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (!building) return { error: "Byggnaden hittades inte." };

  const { error } = await supabase
    .from("property_buildings")
    .update({
      name: nameRaw.trim().slice(0, 80),
      build_year: buildYear,
      updated_at: new Date().toISOString(),
    })
    .eq("id", buildingId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("[profil] update building:", error.message);
    return { error: "Kunde inte spara byggnaden." };
  }

  if (building.type === "huvudbyggnad") {
    const { error: propError } = await supabase
      .from("properties")
      .update({ construction_year: buildYear })
      .eq("id", propertyId);
    if (propError) {
      console.error("[profil] sync property year:", propError.message);
    }
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}

/** Ta bort komplementbyggnad (cascade tar husdelar). Inte huvudbyggnad. */
export async function deletePropertyBuildingAction(
  _prev: PropertyBuildingState,
  formData: FormData,
): Promise<PropertyBuildingState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const buildingId = optionalText(formData, "building_id");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId || !buildingId) return { error: "Ogiltig begäran." };

  const supabase = await createAuthClient();
  const { data: building } = await supabase
    .from("property_buildings")
    .select("id, type")
    .eq("id", buildingId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (!building) return { error: "Byggnaden hittades inte." };
  if (building.type === "huvudbyggnad") {
    return { error: "Huvudbyggnaden kan inte tas bort." };
  }

  const { error } = await supabase
    .from("property_buildings")
    .delete()
    .eq("id", buildingId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("[profil] delete building:", error.message);
    return { error: "Kunde inte ta bort byggnaden." };
  }

  revalidatePath(`/profil/${propertyId}`);
  return { ok: true };
}
