"use client";

import { useId, useState } from "react";

const CONFIRM_FALLBACK =
  "Tack! Vi har tagit emot din adress och håller dig uppdaterad.";

export function SubscribeSection() {
  const formId = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
              disabled={status === "loading"}
            >
              {status === "loading" ? "Skickar…" : "Håll mig uppdaterad"}
            </button>
          </div>
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
