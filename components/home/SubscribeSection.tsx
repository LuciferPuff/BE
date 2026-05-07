"use client";

import Link from "next/link";
import { useId, useState } from "react";

const CONFIRM_FALLBACK =
  "Tack! Vi har tagit emot din adress och håller dig uppdaterad.";

export function SubscribeSection() {
  const formId = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!consent) {
      setStatus("error");
      setMessage("Du måste godkänna integritetspolicyn för att fortsätta.");
      return;
    }
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent: true }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };

      if (data.ok === true) {
        setStatus("success");
        setMessage(
          typeof data.message === "string" && data.message.trim() !== ""
            ? data.message
            : CONFIRM_FALLBACK,
        );
        setEmail("");
        setConsent(false);
        return;
      }

      setStatus("error");
      setMessage(
        typeof data.message === "string" && data.message.trim() !== ""
          ? data.message
          : "Något gick fel. Försök igen.",
      );
    } catch {
      setStatus("error");
      setMessage("Kunde inte ansluta. Kontrollera nätverket och försök igen.");
    }
  }

  return (
    <section
      className="home-section home-section-alt home-subscribe"
      aria-labelledby={`${formId}-subscribe-heading`}
    >
      <div className="home-container home-subscribe-inner">
        <h2
          id={`${formId}-subscribe-heading`}
          className="home-section-title home-section-title-center home-subscribe-title"
        >
          Håll dig uppdaterad
        </h2>
        <p className="home-subscribe-lead">
          Få tips och nyheter om tryggare bostadsköp – direkt i din inkorg.
        </p>
        <form className="home-subscribe-form" onSubmit={onSubmit} noValidate>
          <label className="home-subscribe-label" htmlFor={`${formId}-email`}>
            E-post
          </label>
          <div className="home-subscribe-row">
            <input
              id={`${formId}-email`}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="home-subscribe-input"
              placeholder="din@epost.se"
              disabled={status === "loading"}
              aria-invalid={status === "error"}
              aria-describedby={
                message !== "" ? `${formId}-subscribe-status` : undefined
              }
            />
            <button
              type="submit"
              className="home-subscribe-submit"
              disabled={status === "loading" || !consent}
            >
              {status === "loading" ? "Skickar…" : "Håll mig uppdaterad"}
            </button>
          </div>
          <label className="consent-toggle" htmlFor={`${formId}-consent`}>
            <input
              id={`${formId}-consent`}
              type="checkbox"
              className="consent-toggle__checkbox"
              checked={consent}
              onChange={(ev) => setConsent(ev.target.checked)}
              required
              aria-required="true"
              disabled={status === "loading"}
            />
            <span className="consent-toggle__text">
              Jag har läst och godkänner{" "}
              <Link
                href="/integritetspolicy"
                target="_blank"
                rel="noopener"
                onClick={(ev) => ev.stopPropagation()}
              >
                integritetspolicyn
              </Link>
              .
            </span>
          </label>
          {message !== "" && (
            <p
              id={`${formId}-subscribe-status`}
              className={
                status === "success"
                  ? "home-subscribe-status home-subscribe-status--success"
                  : "home-subscribe-status home-subscribe-status--error"
              }
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
