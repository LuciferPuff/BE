"use client";

import { useActionState } from "react";

import {
  updatePropertyAction,
  type PropertyFormState,
} from "@/app/profil/actions";
import type { PropertyEditData } from "@/lib/properties/get-property-for-edit";
import { PROPERTY_TYPES, propertyTypeLabel } from "@/lib/properties/labels";

const initialState: PropertyFormState = {};

type Props = {
  property: PropertyEditData;
};

export function EditPropertyForm({ property }: Props) {
  const [state, formAction, pending] = useActionState(
    updatePropertyAction,
    initialState,
  );

  return (
    <form className="analyse-form" action={formAction} noValidate>
      <input type="hidden" name="property_id" value={property.id} />

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
          defaultValue={property.address}
          disabled={pending}
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <div className="analyse-form-field">
        <label className="analyse-form-label" htmlFor="property-designation">
          Fastighetsbeteckning{" "}
          <span className="analyse-form-optional">(frivilligt)</span>
        </label>
        <input
          id="property-designation"
          name="designation"
          type="text"
          className="analyse-form-input"
          placeholder="T.ex. Björkbacken 1:23"
          defaultValue={property.designation ?? ""}
          disabled={pending}
          aria-describedby="property-designation-help"
        />
        <p id="property-designation-help" className="analyse-form-help">
          Finns ofta i bostadsannonsen på mäklarens sida t.ex Björkbacken 1:23
        </p>
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
            defaultValue={property.postal_code ?? ""}
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
            defaultValue={property.city ?? ""}
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
          defaultValue={property.kommun ?? ""}
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
          defaultValue={property.property_type ?? ""}
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
          {pending ? "Sparar…" : "Spara ändringar"}
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
