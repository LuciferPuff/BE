"use client";

import { useId, useState } from "react";

type Props = {
  analysisId: string | null;
};

export function FeedbackBox({ analysisId }: Props) {
  const formId = useId();
  const [message, setMessage] = useState("");
  const [confirmedHuman, setConfirmedHuman] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [errorText, setErrorText] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmedHuman) {
      setErrorText("Bekräfta att detta är äkta feedback för att skicka.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorText("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_id: analysisId,
          message: message.trim(),
          confirm_human: true,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };

      if (data.ok === true) {
        setStatus("success");
        setMessage("");
        setConfirmedHuman(false);
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
      <p
        className="analyse-feedback-thanks"
        role="status"
        aria-live="polite"
      >
        Tack! Din feedback hjälper oss att förbättra analysen.
      </p>
    );
  }

  return (
    <form className="analyse-feedback" onSubmit={onSubmit} noValidate>
      <label className="analyse-feedback-label" htmlFor={`${formId}-msg`}>
        Feedback
      </label>
      <textarea
        id={`${formId}-msg`}
        name="message"
        className="analyse-feedback-textarea"
        rows={4}
        required
        value={message}
        onChange={(ev) => setMessage(ev.target.value)}
        disabled={status === "loading"}
        placeholder="Något som saknades eller var fel i analysen? Berätta för oss."
        aria-describedby={
          errorText !== "" ? `${formId}-feedback-err` : undefined
        }
      />
      <label className="analyse-feedback-honeypot">
        <input
          type="checkbox"
          checked={confirmedHuman}
          onChange={(ev) => setConfirmedHuman(ev.target.checked)}
          disabled={status === "loading"}
        />
        <span>
          Jag bekräftar att det här är äkta feedback och inte spam eller
          automatiska inlägg.
        </span>
      </label>
      <button
        type="submit"
        className="analyse-feedback-submit"
        disabled={status === "loading" || message.trim() === ""}
      >
        {status === "loading" ? "Skickar…" : "Skicka"}
      </button>
      {errorText !== "" && (
        <p
          id={`${formId}-feedback-err`}
          className="analyse-form-feedback analyse-form-feedback--error"
          role="alert"
        >
          {errorText}
        </p>
      )}
    </form>
  );
}
