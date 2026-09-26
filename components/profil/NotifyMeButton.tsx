"use client";

import { useActionState } from "react";

import {
  registerFeatureInterestAction,
  type FeatureInterestState,
} from "@/app/profil/actions";

type Props = {
  feature: string;
  propertyId: string;
  alreadyInterested: boolean;
};

const initial: FeatureInterestState = {};

export function NotifyMeButton({
  feature,
  propertyId,
  alreadyInterested,
}: Props) {
  const [state, formAction, pending] = useActionState(
    registerFeatureInterestAction,
    initial,
  );
  const done = alreadyInterested || Boolean(state.ok);

  if (done) {
    return (
      <p className="profile-teaser-done" role="status">
        Vi hör av oss ✓
      </p>
    );
  }

  return (
    <form action={formAction} className="profile-teaser-notify">
      <input type="hidden" name="feature" value={feature} />
      <input type="hidden" name="property_id" value={propertyId} />
      <button
        type="submit"
        className="profile-edit-link"
        disabled={pending}
      >
        {pending ? "Sparar…" : "Meddela mig när det finns"}
      </button>
      {state.error ? (
        <p className="profile-ownership-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
