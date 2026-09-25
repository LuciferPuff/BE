"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  unlinkAnalysisAction,
  type UnlinkAnalysisState,
} from "@/app/mina-analyser/actions";

type Props = {
  analysisId: string;
  /** Var användaren ska landa efter lyckad bortkoppling. */
  returnTo?: "analysis" | "profil";
  /** Visuell variant. */
  variant?: "panel" | "inline";
};

const initialState: UnlinkAnalysisState = {};

export function UnlinkAnalysisButton({
  analysisId,
  returnTo = "analysis",
  variant = "panel",
}: Props) {
  const [state, formAction, pending] = useActionState(
    unlinkAnalysisAction,
    initialState,
  );

  if (variant === "inline") {
    return (
      <form action={formAction} className="unlink-analysis-inline">
        <input type="hidden" name="analysis_id" value={analysisId} />
        <input type="hidden" name="return_to" value={returnTo} />
        <button
          type="submit"
          className="unlink-analysis-inline-btn"
          disabled={pending}
        >
          {pending ? "Tar bort…" : "Ta bort koppling"}
        </button>
        {state.error ? (
          <span className="unlink-analysis-inline-error" role="alert">
            {state.error}
          </span>
        ) : null}
      </form>
    );
  }

  return (
    <div className="link-analysis-linked">
      <p className="link-analysis-linked-text">
        Kopplad till en fastighet i din profil.{" "}
        <Link href="/profil">Visa profil →</Link>
      </p>
      <form action={formAction} className="unlink-analysis-form">
        <input type="hidden" name="analysis_id" value={analysisId} />
        <input type="hidden" name="return_to" value={returnTo} />
        <button
          type="submit"
          className="unlink-analysis-btn"
          disabled={pending}
        >
          {pending ? "Tar bort…" : "Ta bort koppling"}
        </button>
      </form>
      {state.error ? (
        <p
          className="analyse-form-feedback analyse-form-feedback--error"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
