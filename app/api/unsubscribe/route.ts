import { NextResponse } from "next/server";

import { createSubscribeSupabaseClient } from "@/lib/supabase/subscribe-client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OK_MESSAGE = "Du är nu avregistrerad. Vi hör inte av oss mer.";
const NOT_FOUND_MESSAGE =
  "Länken är ogiltig eller har redan använts. Kontakta hej@byggello.se om du behöver hjälp.";

/**
 * Accepterar token via:
 *   - query string `?token=...` (RFC 8058 ett-klicks-avregistrering)
 *   - JSON-body `{ "token": "..." }` (egna /avregistrera-sidan)
 *   - form-body `token=...` (mail-klienter med List-Unsubscribe-Post)
 */
async function readToken(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("token");
  if (fromQuery) return fromQuery;

  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { token?: unknown };
      return typeof body?.token === "string" ? body.token : null;
    }
    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await request.formData();
      const value = form.get("token");
      return typeof value === "string" ? value : null;
    }
  } catch {
    return null;
  }

  return null;
}

export async function POST(request: Request) {
  const token = await readToken(request);

  if (!token || !UUID_RE.test(token)) {
    return NextResponse.json(
      { ok: false, message: "Ogiltig avregistreringslänk." },
      { status: 400 },
    );
  }

  const supabase = createSubscribeSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Tjänsten är tillfälligt otillgänglig." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase.rpc("unsubscribe_by_token", {
    p_token: token,
  });

  if (error) {
    console.error("[unsubscribe] Supabase:", error.message);
    return NextResponse.json(
      { ok: false, message: "Något gick fel. Försök igen senare." },
      { status: 500 },
    );
  }

  if (data !== true) {
    return NextResponse.json(
      { ok: false, message: NOT_FOUND_MESSAGE },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, message: OK_MESSAGE });
}
