"use client";

import Link from "next/link";
import { useId, useState } from "react";

// TODO(BYG-97): GDPR-raden (`gdpr`) och tips-underraden (`confirmSubscribed`) är
// platshållare tills den exakta copyn från Linear-kommentaren klistrats in.
// Knapp, kryssruta och huvudbekräftelse är texterna som angavs i uppgiften.
const COPY = {
  heading: "Få analysen mejlad till dig",
  emailLabel: "Din e-postadress",
  emailPlaceholder: "namn@exempel.se",
  button: "Mejla mig analysen",
  subscribeLabel: "Ja, skicka mig tips inför visningen och budgivningen.",
  gdpr: "Vi använder din e-postadress för att skicka analysen.",
  confirm: "Klart – analysen är på väg till din inkorg.",
  confirmSubscribed:
    "Vi hör av oss med tips inför visningen och budgivningen.",
};

type Props = {
  analysisId: string;
};

type ApiResponse = {
  ok?: boolean;
  message?: string;
  subscribed?: boolean;
};

export function EmailAnalysisBox({ analysisId }: Props) {
  const formId = useId();
  const [email, setEmail] = useState("");
  const [subscribe, setSubscribe] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorText, setErrorText] = useState("");
  const [didSubscribe, setDidSubscribe] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorText("");

    try {
      const res = await fetch("/api/analyse/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          email: email.trim(),
          subscribe,
        }),
      });
      const data = (await res.json()) as ApiResponse;

      if (res.ok && data.ok === true) {
        setDidSubscribe(data.subscribed === true);
        setStatus("success");
        return;
      }

      setStatus("error");
      setErrorText(
        typeof data.message === "string" && data.message !== ""
          ? data.message
          : "Kunde inte skicka. Försök igen.",
      );
    } catch {
      setStatus("error");
      setErrorText("Kunde inte ansluta. Försök igen senare.");
    }
  }

  if (status === "success") {
    return (
      <div
        className="analyse-email-box analyse-email-box--done"
        role="status"
        aria-live="polite"
      >
        <p className="analyse-email-confirm">{COPY.confirm}</p>
        {didSubscribe && (
          <p className="analyse-email-confirm-sub">{COPY.confirmSubscribed}</p>
        )}
      </div>
    );
  }

  return (
    <form className="analyse-email-box" onSubmit={onSubmit} noValidate>
      <h2 className="analyse-result-heading">{COPY.heading}</h2>

      <div className="analyse-form-field">
        <label className="analyse-form-label" htmlFor={`${formId}-email`}>
          {COPY.emailLabel}
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          className="analyse-form-input"
          placeholder={COPY.emailPlaceholder}
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          disabled={status === "loading"}
          aria-describedby={
            errorText !== "" ? `${formId}-email-err` : undefined
          }
        />
      </div>

      <label className="analyse-email-consent">
        <input
          type="checkbox"
          checked={subscribe}
          onChange={(ev) => setSubscribe(ev.target.checked)}
          disabled={status === "loading"}
        />
        <span>{COPY.subscribeLabel}</span>
      </label>

      <button
        type="submit"
        className="analyse-form-submit"
        disabled={status === "loading" || email.trim() === ""}
      >
        {status === "loading" ? "Skickar…" : COPY.button}
      </button>

      <p className="analyse-email-gdpr">
        {COPY.gdpr}{" "}
        <Link href="/integritetspolicy" className="analyse-email-gdpr-link">
          Läs mer i vår integritetspolicy
        </Link>
        .
      </p>

      {errorText !== "" && (
        <p
          id={`${formId}-email-err`}
          className="analyse-form-feedback analyse-form-feedback--error"
          role="alert"
        >
          {errorText}
        </p>
      )}
    </form>
  );
}
