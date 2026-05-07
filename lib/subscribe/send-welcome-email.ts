import { Resend } from "resend";

import { getSiteUrl } from "@/lib/site";

/**
 * Skickar bekräftelse via Resend. Anropas endast från server (t.ex. API-route).
 * Vid saknad nyckel eller fel loggas tyst – användaren får ändå OK från API.
 */
export async function sendSubscriberWelcomeEmail(
  toEmail: string,
  unsubscribeToken: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const from =
    process.env.RESEND_FROM?.trim() || "Byggello <onboarding@resend.dev>";
  const site = getSiteUrl();
  const tokenParam = encodeURIComponent(unsubscribeToken);
  const visibleUnsubscribeUrl = `${site}/avregistrera?token=${tokenParam}`;
  const oneClickUnsubscribeUrl = `${site}/api/unsubscribe?token=${tokenParam}`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: toEmail,
    subject: "Tack – du håller dig uppdaterad med Byggello",
    headers: {
      // RFC 8058: ett-klicks-avregistrering i Gmail/Apple Mail (mail-klienter
      // POST:ar till URL:en med `List-Unsubscribe=One-Click`).
      "List-Unsubscribe": `<${oneClickUnsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: `<p style="font-family:sans-serif;color:#1B2E3C;line-height:1.6">Tack för att du vill hålla dig uppdaterad.</p>
<p style="font-family:sans-serif;color:#1B2E3C;line-height:1.6">Vi återkommer med nyheter och tips kring bostadsköp.</p>
<p style="font-family:sans-serif;color:#1B2E3C;line-height:1.6"><a href="${site}" style="color:#F26522">Besök Byggello</a></p>
<hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0" />
<p style="font-family:sans-serif;color:#1B2E3C;line-height:1.6;font-size:0.8125rem;opacity:0.7">Du får detta mail eftersom du anmält dig till Byggellos uppdateringar. <a href="${visibleUnsubscribeUrl}" style="color:#1B2E3C">Avregistrera dig</a> när du vill.</p>`,
  });

  if (error) {
    console.error("[subscribe] Resend:", error.message);
  }
}
