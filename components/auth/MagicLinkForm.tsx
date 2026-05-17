"use client";

import Link from "next/link";
import { useId, useState } from "react";

const CONFIRM_FALLBACK =
  "Om adressen finns hos oss skickar vi en inloggningslänk till din inkorg.";

type Props = {
  authError?: boolean;
};

export function MagicLinkForm({ authError = false }: Props) {
  const formId = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    authError ? "error" : "idle",
  );
  const [message, setMessage] = useState(
    authError
      ? "Inloggningslänken gick inte att använda. Begär en ny länk nedan."
      : "",
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };

      if (res.ok && data.ok === true) {
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
          disabled={status === "loading" || status === "success"}
          aria-invalid={status === "error"}
          aria-describedby={
            message !== "" ? `${formId}-auth-status` : undefined
          }
        />
      </div>
      <p className="auth-form-hint">
        Vi skickar en engångslänk – inget lösenord behövs. Länken fungerar för
        både nya och befintliga konton.
      </p>
      <div className="analyse-form-actions">
        <button
          type="submit"
          className="analyse-form-submit"
          disabled={status === "loading" || status === "success"}
        >
          {status === "loading" ? "Skickar…" : "Skicka inloggningslänk"}
        </button>
      </div>
      {message !== "" && (
        <p
          id={`${formId}-auth-status`}
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
      <p className="auth-form-footer">
        Vill du bara få nyhetsbrev?{" "}
        <Link href="/registrera">Registrera intresse</Link>.
      </p>
    </form>
  );
}
