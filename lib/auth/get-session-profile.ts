import "server-only";

import { cache } from "react";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { createAuthClient } from "@/lib/supabase/auth-client";

export type AppRole = "user" | "admin" | "super_admin";

export type SessionProfile = {
  id: string;
  email: string | null;
  fullName: string | null;
  appRole: AppRole;
};

function parseAppRole(value: unknown): AppRole {
  if (value === "admin" || value === "super_admin" || value === "user") {
    return value;
  }
  return "user";
}

export function isStaffRole(role: AppRole): boolean {
  return role === "admin" || role === "super_admin";
}

/** Dedupad per request – header/footer/admin delar samma fetch. */
export const getSessionProfile = cache(
  async (): Promise<SessionProfile | null> => {
    const user = await getSessionUser();
    if (!user) return null;

    const supabase = await createAuthClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, app_role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("[auth] getSessionProfile:", error.message);
      return null;
    }

    return {
      id: data.id as string,
      email: (data.email as string | null) ?? user.email ?? null,
      fullName: (data.full_name as string | null) ?? null,
      appRole: parseAppRole(data.app_role),
    };
  },
);
