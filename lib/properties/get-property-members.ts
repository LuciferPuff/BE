import { createAuthClient } from "@/lib/supabase/auth-client";
import { isPropertyRole, type PropertyRole } from "@/lib/properties/labels";

export type PropertyMember = {
  memberId: string;
  userId: string;
  role: PropertyRole;
  fullName: string | null;
  email: string | null;
  createdAt: string;
};

type RpcRow = {
  member_id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

export async function getPropertyMembers(
  propertyId: string,
): Promise<PropertyMember[]> {
  const supabase = await createAuthClient();
  const { data, error } = await supabase.rpc("get_property_members", {
    p_property_id: propertyId,
  });

  if (error) {
    console.error("[profil] get_property_members:", error.message);
    return [];
  }

  const rows = (data ?? []) as RpcRow[];
  const members: PropertyMember[] = [];
  for (const row of rows) {
    if (!isPropertyRole(row.role)) continue;
    members.push({
      memberId: row.member_id,
      userId: row.user_id,
      role: row.role,
      fullName: row.full_name,
      email: row.email,
      createdAt: row.created_at,
    });
  }
  return members;
}
