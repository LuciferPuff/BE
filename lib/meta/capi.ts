/**
 * Meta Conversions API – server only. Anropa aldrig från klienten.
 * client_ip_address och client_user_agent skickas i klartext enligt Metas spec
 * (inte hashade).
 */

type SendLeadEventParams = {
  eventId: string;
  clientIp: string;
  userAgent: string;
  eventSourceUrl: string;
};

export async function sendLeadEvent({
  eventId,
  clientIp,
  userAgent,
  eventSourceUrl,
}: SendLeadEventParams): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID?.trim();
  const token = process.env.META_CAPI_TOKEN?.trim();
  if (!pixelId || !/^\d+$/.test(pixelId) || !token) {
    return;
  }

  const userData: Record<string, string> = {};
  if (clientIp !== "" && clientIp !== "unknown") {
    userData.client_ip_address = clientIp;
  }
  const ua = userAgent.trim();
  if (ua !== "") {
    userData.client_user_agent = ua;
  }

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: eventSourceUrl,
        ...(Object.keys(userData).length > 0 ? { user_data: userData } : {}),
      },
    ],
    access_token: token,
  };

  const testCode = process.env.META_CAPI_TEST_CODE?.trim();
  if (testCode) {
    payload.test_event_code = testCode;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(
        "[meta-capi] Lead failed:",
        res.status,
        text.slice(0, 500),
      );
    }
  } catch (err) {
    console.error("[meta-capi] Lead error:", err);
  }
}
