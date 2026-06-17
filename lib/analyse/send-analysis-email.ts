import { Resend } from "resend";

import { getSiteUrl } from "@/lib/site";
import type {
  AnalysisFinding,
  AnalysisResult,
} from "@/lib/analyse/parse-analysis-json";

const TEXT = "font-family:sans-serif;color:#1B2E3C;line-height:1.6";

/** Innehållet kommer från AI/användarinput – escapa allt som injiceras i HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderFindings(items: AnalysisFinding[]): string {
  if (items.length === 0) {
    return `<p style="${TEXT}">Inga punkter noterades.</p>`;
  }
  return `<ul style="padding-left:18px;margin:0">${items
    .map((it) => {
      const parts: string[] = [];
      if (it.vadDetAr !== "") {
        parts.push(
          `<p style="${TEXT};margin:4px 0"><strong>Vad det är:</strong> ${escapeHtml(it.vadDetAr)}</p>`,
        );
      }
      if (it.varforDetSpelarRoll !== "") {
        parts.push(
          `<p style="${TEXT};margin:4px 0"><strong>Varför det spelar roll:</strong> ${escapeHtml(it.varforDetSpelarRoll)}</p>`,
        );
      }
      if (it.vadDuGor !== "") {
        parts.push(
          `<p style="${TEXT};margin:4px 0"><strong>Vad du gör:</strong> ${escapeHtml(it.vadDuGor)}</p>`,
        );
      }
      return `<li style="margin:0 0 16px"><strong style="${TEXT}">${escapeHtml(it.titel)}</strong>${parts.join("")}</li>`;
    })
    .join("")}</ul>`;
}

function renderQuestions(questions: string[]): string {
  if (questions.length === 0) {
    return `<p style="${TEXT}">Inga frågor noterades.</p>`;
  }
  return `<ol style="padding-left:18px;margin:0">${questions
    .map((q) => `<li style="${TEXT};margin:0 0 8px">${escapeHtml(q)}</li>`)
    .join("")}</ol>`;
}

/**
 * Skickar bostadsanalysen via Resend. Returnerar true vid lyckat utskick.
 * Anropas endast från server. Återanvänder samma Resend-uppsättning som
 * prenumerations-välkomstmailet (lib/subscribe/send-welcome-email.ts).
 */
export async function sendAnalysisEmail(
  toEmail: string,
  analysis: AnalysisResult,
  address: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("[analyse-email] saknar RESEND_API_KEY");
    return false;
  }

  const from =
    process.env.RESEND_FROM?.trim() || "Byggello <onboarding@resend.dev>";
  const site = getSiteUrl();
  const safeAddress = escapeHtml(address);

  const html = `<div style="max-width:640px;margin:0 auto">
<p style="${TEXT}">Här är din bostadsanalys från Byggello${address !== "" ? ` för <strong>${safeAddress}</strong>` : ""}.</p>

<h2 style="${TEXT};font-size:1.125rem;margin:24px 0 8px">Röda flaggor</h2>
${renderFindings(analysis.rodaFlaggor)}

<h2 style="${TEXT};font-size:1.125rem;margin:24px 0 8px">Underhåll och åtgärder</h2>
${renderFindings(analysis.underhallsvarningar)}

<h2 style="${TEXT};font-size:1.125rem;margin:24px 0 8px">Frågor till mäklaren</h2>
${renderQuestions(analysis.fragorTillMaklaren)}

<hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0" />
<p style="${TEXT}">Analysen är ett beslutsstöd och ersätter inte en besiktning.</p>
<p style="${TEXT}"><a href="${site}" style="color:#F26522">Gör en ny analys på Byggello</a></p>
</div>`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: toEmail,
    subject:
      address !== ""
        ? `Din bostadsanalys: ${address}`
        : "Din bostadsanalys från Byggello",
    html,
  });

  if (error) {
    console.error("[analyse-email] Resend:", error.message);
    return false;
  }
  return true;
}
