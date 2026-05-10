"use client";

/**
 * Adressfält med Google Places Autocomplete (BYG-56).
 *
 * Designval:
 *  - Lazy-loadar Google Maps-scriptet först när användaren fokuserar inputen.
 *    Det här sparar ~200kB och en DNS-lookup på alla sidor utanför /analys
 *    och undviker att Google sätter cookies på sidor där användaren aldrig
 *    interagerar med adressfältet (relevant för vår integritetspolicy).
 *  - Använder legacy `google.maps.places.Autocomplete` för att kunna behålla
 *    vår egen <input> och dess CSS-klasser. API:n är Legacy-deprekerad sedan
 *    mars 2025; Google har lovat >=1 års notice innan removal.
 *    Migrationsplan när vi byter till PlaceAutocompleteElement:
 *    https://developers.google.com/maps/documentation/javascript/place-autocomplete-element-migration
 *  - Försöker hela tiden hålla `value` synkad mot inputen så fallback fungerar
 *    även om scriptet inte laddar (CSP-blockering, nätverk, etc.).
 */

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";

type Props = {
  id: string;
  value: string;
  onChange: (data: { address: string; city: string }) => void;
  error?: string;
  disabled?: boolean;
  /** Pekar på id för felmeddelandet i föräldern, för aria-describedby. */
  errorId?: string;
};

let placesPromise: Promise<google.maps.PlacesLibrary> | null = null;

function ensurePlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  if (placesPromise != null) return placesPromise;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY saknas"));
  }
  setOptions({
    key: apiKey,
    v: "weekly",
    language: "sv",
    region: "SE",
  });
  placesPromise = importLibrary("places");
  return placesPromise;
}

function extractCity(
  components: google.maps.GeocoderAddressComponent[] | undefined,
): string {
  if (!components) return "";
  // För svenska adresser är postal_town typiskt vad användaren menar med
  // "ort" (t.ex. Märsta, Sundbyberg). locality kan vara kommunen
  // (t.ex. "Sigtuna kommun") och används som fallback.
  const postalTown = components.find((c) => c.types.includes("postal_town"));
  if (postalTown?.long_name) return postalTown.long_name;
  const locality = components.find((c) => c.types.includes("locality"));
  return locality?.long_name ?? "";
}

export function AddressAutocomplete({
  id,
  value,
  onChange,
  error,
  disabled,
  errorId,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">(
    "idle",
  );

  async function initAutocomplete() {
    if (status !== "idle" || !inputRef.current) return;
    setStatus("loading");
    try {
      const places = await ensurePlacesLibrary();
      if (!inputRef.current) return;
      const ac = new places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "se" },
        fields: ["formatted_address", "address_components"],
        types: ["address"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const formatted =
          place.formatted_address ?? inputRef.current?.value ?? "";
        const city = extractCity(place.address_components);
        onChange({ address: formatted, city });
      });
      autocompleteRef.current = ac;
      setStatus("ready");
    } catch (err) {
      console.warn(
        "[AddressAutocomplete] Google Places kunde inte laddas:",
        err,
      );
      setStatus("failed");
    }
  }

  useEffect(() => {
    return () => {
      if (autocompleteRef.current && typeof google !== "undefined") {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      autocompleteRef.current = null;
    };
  }, []);

  return (
    <input
      ref={inputRef}
      id={id}
      name="address"
      type="text"
      // Semantiskt: address-line1. Lämnar browserns adressautofyll på (Googles
      // pac-container ligger ovanpå när scriptet är laddat). autoComplete="off"
      // triggade pwd-manager-extensions (1Password/Bitwarden/LastPass) att
      // injicera badges per tecken i fältet.
      autoComplete="address-line1"
      data-1p-ignore="true"
      data-lpignore="true"
      data-form-type="other"
      required
      className="analyse-form-input"
      value={value}
      onChange={(ev) => onChange({ address: ev.target.value, city: "" })}
      onFocus={() => {
        if (status === "idle") {
          void initAutocomplete();
        }
      }}
      disabled={disabled}
      aria-invalid={error != null}
      aria-describedby={error != null ? errorId : undefined}
    />
  );
}
