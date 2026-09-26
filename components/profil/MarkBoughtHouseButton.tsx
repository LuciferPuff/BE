"use client";

import { useActionState } from "react";

import {
  markBoughtHouseAction,
  type OwnershipStatusState,
} from "@/app/profil/actions";

type Props = {
  propertyId: string;
  variant?: "primary" | "secondary";
};

const initialState: OwnershipStatusState = {};

export function MarkBoughtHouseButton({
  propertyId,
  variant = "primary",
}: Props) {
  const [state, formAction, pending] = useActionState(
    markBoughtHouseAction,
    initialState,
  );

  return (
    <form action={formAction} className="profile-bought-form">
      <input type="hidden" name="property_id" value={propertyId} />
      <button
        type="submit"
        className={
          variant === "primary"
            ? "home-btn home-btn-primary"
            : "profile-edit-link"
        }
        disabled={pending}
      >
        {pending ? "Sparar…" : "Jag köpte huset"}
      </button>
      {state.error ? (
        <p className="profile-ownership-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
