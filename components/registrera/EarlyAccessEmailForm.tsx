"use client";

import { useId, useState } from "react";

const CONFIRM_FALLBACK =
  "Tack! Vi har tagit emot din adress och håller dig uppdaterad.";

export function EarlyAccessEmailForm() {
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
    <form className="analyse-form" onSubmit={onSubmit} noValidate>
      <div className="analyse-form-field">
        <label className="analyse-form-label" htmlFor={`${formId}-email`}>
          E-post <span aria-hidden="true">*</span>
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          className="analyse-form-input"
          placeholder="din@epost.se"
          disabled={status === "loading"}
          aria-invalid={status === "error"}
          aria-describedby={
            message !== "" ? `${formId}-registrera-status` : undefined
          }
        />
      </div>
      <div className="analyse-form-actions">
        <button
          type="submit"
          className="analyse-form-submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Skickar…" : "Skicka"}
        </button>
      </div>
      {message !== "" && (
        <p
          id={`${formId}-registrera-status`}
          className={
            status === "success"
              ? "analyse-form-feedback analyse-form-feedback--success"
              : "analyse-form-feedback analyse-form-feedback--error"
          }
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </form>
  );
}
