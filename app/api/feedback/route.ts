import { NextResponse } from "next/server";

import { createAnalysesSupabaseClient } from "@/lib/supabase/analyses-client";

const MAX_MESSAGE_LEN = 8000;

type Body = {
  analysis_id?: string | null;
  message?: string;
  /** Måste vara true – skyddar mot enkla skript som inte skickar formuläret. */
  confirm_human?: boolean;
};

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Ogiltig begäran." },
      { status: 400 },
    );
  }

  if (body.confirm_human !== true) {
    return NextResponse.json(
      { ok: false, message: "Bekräfta att feedbacken är äkta." },
      { status: 400 },
    );
  }

  const rawMessage =
    typeof body.message === "string" ? body.message.trim() : "";
  if (rawMessage === "") {
    return NextResponse.json(
      { ok: false, message: "Meddelandet får inte vara tomt." },
      { status: 400 },
    );
  }
  if (rawMessage.length > MAX_MESSAGE_LEN) {
    return NextResponse.json(
      { ok: false, message: "Meddelandet är för långt." },
      { status: 400 },
    );
  }

  let analysisId: string | null = null;
  if (body.analysis_id != null && body.analysis_id !== "") {
    const aid = String(body.analysis_id).trim();
    if (!isUuid(aid)) {
      return NextResponse.json(
        { ok: false, message: "Ogiltigt analysis_id." },
        { status: 400 },
      );
    }
    analysisId = aid;
  }

  const supabase = createAnalysesSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Serverkonfiguration saknas." },
      { status: 503 },
    );
  }

  const { error } = await supabase.from("feedback").insert({
    analysis_id: analysisId,
    message: rawMessage,
  });

  if (error) {
    console.error("[feedback]", error.message);
    return NextResponse.json(
      { ok: false, message: "Kunde inte spara feedback." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
