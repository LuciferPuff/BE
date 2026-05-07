"use client";

import Link from "next/link";
import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

const FALLBACK_OK = "Du är nu avregistrerad. Vi hör inte av oss mer.";
const FALLBACK_ERR =
  "Något gick fel. Försök igen om en stund eller kontakta hej@byggello.se.";

export function UnsubscribeConfirm({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onConfirm() {
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };

      if (data.ok === true) {
        setStatus("success");
        setMessage(
          typeof data.message === "string" && data.message.trim() !== ""
            ? data.message
            : FALLBACK_OK,
        );
        return;
      }

      setStatus("error");
      setMessage(
        typeof data.message === "string" && data.message.trim() !== ""
          ? data.message
          : FALLBACK_ERR,
      );
    } catch {
      setStatus("error");
      setMessage("Kunde inte ansluta. Kontrollera nätverket och försök igen.");
    }
  }

  if (status === "success") {
    return (
      <>
        <p className="analyse-form-feedback analyse-form-feedback--success" role="status">
          {message}
        </p>
        <p>
          <Link href="/">Tillbaka till startsidan</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <p>
        Klicka på knappen nedan för att avregistrera din e-postadress från
        Byggellos uppdateringar. Vi sparar då en notering att du avregistrerat
        dig och slutar skicka mail till adressen.
      </p>
      <div className="analyse-form-actions">
        <button
          type="button"
          onClick={onConfirm}
          className="analyse-form-submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Avregistrerar…" : "Bekräfta avregistrering"}
        </button>
      </div>
      {message !== "" && (
        <p className="analyse-form-feedback analyse-form-feedback--error" role="status">
          {message}
        </p>
      )}
    </>
  );
}
