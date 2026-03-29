import { getSupabaseClient } from "@/lib/supabase/client";

export default async function Home() {
  const supabase = getSupabaseClient();
  let statusText =
    "Saknar NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_PUBLISHABLE i .env.local.";

  if (supabase) {
    const { error } = await supabase.from("healthcheck").select("id").limit(1);
    statusText = error ? "Kontakt finns, men kontrollera tabellen healthcheck i Supabase." : "OK";
  }

  return (
    <main>
      <h1>Next.js + Supabase</h1>
      <p>Projektet ar redo for Vercel deploy.</p>
      <p>Supabase-anslutning: {statusText}</p>
    </main>
  );
}
