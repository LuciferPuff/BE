import { Resend } from "resend";

import { getSiteUrl } from "@/lib/site";

/**
 * Skickar bekräftelse via Resend. Anropas endast från server (t.ex. API-route).
 * Vid saknad nyckel eller fel loggas tyst – användaren får ändå OK från API.
 */
export async function sendSubscriberWelcomeEmail(toEmail: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const from =
    process.env.RESEND_FROM?.trim() || "Byggello <onboarding@resend.dev>";
  const site = getSiteUrl();

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: toEmail,
    subject: "Tack – du håller dig uppdaterad med Byggello",
    html: `<p style="font-family:sans-serif;color:#1B2E3C;line-height:1.6">Tack för att du vill hålla dig uppdaterad.</p>
<p style="font-family:sans-serif;color:#1B2E3C;line-height:1.6">Vi återkommer med nyheter och tips kring bostadsköp.</p>
<p style="font-family:sans-serif;color:#1B2E3C;line-height:1.6"><a href="${site}" style="color:#F26522">Besök Byggello</a></p>`,
  });

  if (error) {
    console.error("[subscribe] Resend:", error.message);
  }
}
