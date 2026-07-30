"use client";

import { useActionState } from "react";

import {
  createPropertyAction,
  type CreatePropertyState,
} from "@/app/profil/actions";
import { PROPERTY_TYPES, propertyTypeLabel } from "@/lib/properties/labels";

const initialState: CreatePropertyState = {};

export function CreatePropertyForm() {
  const [state, formAction, pending] = useActionState(
    createPropertyAction,
    initialState,
  );

  return (
    <form className="analyse-form" action={formAction} noValidate>
      <div className="analyse-form-field">
        <label className="analyse-form-label" htmlFor="property-address">
          Adress <span aria-hidden="true">*</span>
        </label>
        <input
          id="property-address"
          name="address"
          type="text"
          required
          autoComplete="street-address"
          className="analyse-form-input"
          placeholder="T.ex. Testgatan 1"
          disabled={pending}
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <div className="analyse-form-row">
        <div className="analyse-form-field">
          <label className="analyse-form-label" htmlFor="property-postal">
            Postnummer
          </label>
          <input
            id="property-postal"
            name="postal_code"
            type="text"
            autoComplete="postal-code"
            className="analyse-form-input"
            placeholder="123 45"
            disabled={pending}
          />
        </div>
        <div className="analyse-form-field">
          <label className="analyse-form-label" htmlFor="property-city">
            Ort
          </label>
          <input
            id="property-city"
            name="city"
            type="text"
            autoComplete="address-level2"
            className="analyse-form-input"
            placeholder="Stockholm"
            disabled={pending}
          />
        </div>
      </div>

      <div className="analyse-form-field">
        <label className="analyse-form-label" htmlFor="property-kommun">
          Kommun
        </label>
        <input
          id="property-kommun"
          name="kommun"
          type="text"
          className="analyse-form-input"
          placeholder="T.ex. Stockholm"
          disabled={pending}
        />
      </div>

      <div className="analyse-form-field">
        <label className="analyse-form-label" htmlFor="property-type">
          Fastighetstyp
        </label>
        <select
          id="property-type"
          name="property_type"
          className="analyse-form-input"
          defaultValue=""
          disabled={pending}
        >
          <option value="">Välj typ (valfritt)</option>
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {propertyTypeLabel(type)}
            </option>
          ))}
        </select>
      </div>

      <div className="analyse-form-actions">
        <button
          type="submit"
          className="analyse-form-submit"
          disabled={pending}
        >
          {pending ? "Sparar…" : "Skapa fastighet"}
        </button>
      </div>

      {state.error ? (
        <p
          className="analyse-form-feedback analyse-form-feedback--error"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
