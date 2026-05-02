import { NextResponse } from "next/server";

import { createPingSupabaseClient } from "@/lib/supabase/ping-client";

export const dynamic = "force-dynamic";

/**
 * Enkel hälsokoll + väcker Supabase. Anropas t.ex. av Vercel Cron.
 * Nycklar läses endast från miljövariabler (service role krävs för SELECT på subscribers).
 */
export async function GET() {
  const supabase = createPingSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Saknar NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 },
    );
  }

  const { error } = await supabase
    .from("subscribers")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("[ping] Supabase:", error.message);
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
