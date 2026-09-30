import "server-only";

import { notFound, redirect } from "next/navigation";

import {
  getSessionProfile,
  isStaffRole,
  type SessionProfile,
} from "@/lib/auth/get-session-profile";

/** Kräver inloggad admin/super_admin. Annars login-redirect eller 404. */
export async function requireAdmin(): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) {
    redirect("/logga-in?next=/admin");
  }
  if (!isStaffRole(profile.appRole)) {
    notFound();
  }
  return profile;
}
