"use client";

import { useActionState } from "react";

import {
  updateOwnershipStatusAction,
  type OwnershipStatusState,
} from "@/app/profil/actions";
import type { OwnershipStatus } from "@/lib/properties/labels";

type Props = {
  propertyId: string;
  value: OwnershipStatus;
  disabled?: boolean;
};

const initialState: OwnershipStatusState = {};

export function OwnershipStatusSwitch({
  propertyId,
  value,
  disabled = false,
}: Props) {
  const [state, formAction, pending] = useActionState(
    updateOwnershipStatusAction,
    initialState,
  );

  return (
    <div className="profile-ownership">
      <p className="profile-ownership-label" id={`ownership-${propertyId}`}>
        Status
      </p>
      <div
        className="profile-ownership-toggle"
        role="group"
        aria-labelledby={`ownership-${propertyId}`}
      >
        <form action={formAction}>
          <input type="hidden" name="property_id" value={propertyId} />
          <input type="hidden" name="ownership_status" value="funderar" />
          <button
            type="submit"
            className={
              value === "funderar"
                ? "profile-ownership-btn profile-ownership-btn--active"
                : "profile-ownership-btn"
            }
            disabled={disabled || pending || value === "funderar"}
          >
            Funderar på att köpa
          </button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="property_id" value={propertyId} />
          <input type="hidden" name="ownership_status" value="ager" />
          <button
            type="submit"
            className={
              value === "ager"
                ? "profile-ownership-btn profile-ownership-btn--active"
                : "profile-ownership-btn"
            }
            disabled={disabled || pending || value === "ager"}
          >
            Äger
          </button>
        </form>
      </div>
      {state.error ? (
        <p className="profile-ownership-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
