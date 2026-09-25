"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  SWEDISH_MUNICIPALITIES,
  isSwedishMunicipality,
} from "@/lib/geo/swedish-municipalities";

type Props = {
  id?: string;
  name?: string;
  defaultValue?: string | null;
  disabled?: boolean;
  required?: boolean;
  "aria-invalid"?: boolean | "true" | "false";
};

const MAX_SUGGESTIONS = 12;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("sv");
}

function findExactMunicipality(query: string): string | null {
  const q = normalize(query);
  if (!q) return null;
  const match = SWEDISH_MUNICIPALITIES.find((m) => normalize(m.name) === q);
  return match?.name ?? null;
}

function filterMunicipalities(query: string): string[] {
  const q = normalize(query);
  if (!q) {
    return SWEDISH_MUNICIPALITIES.slice(0, MAX_SUGGESTIONS).map((m) => m.name);
  }

  const prefix: string[] = [];
  const contains: string[] = [];
  for (const m of SWEDISH_MUNICIPALITIES) {
    const name = m.name;
    const n = normalize(name);
    if (n.startsWith(q)) prefix.push(name);
    else if (n.includes(q)) contains.push(name);
  }
  return [...prefix, ...contains].slice(0, MAX_SUGGESTIONS);
}

export function MunicipalitySelect({
  id = "property-kommun",
  name = "kommun",
  defaultValue = null,
  disabled = false,
  required = true,
  "aria-invalid": ariaInvalid,
}: Props) {
  const listboxId = useId();
  const known =
    defaultValue && isSwedishMunicipality(defaultValue) ? defaultValue : "";

  const [query, setQuery] = useState(known);
  const [selected, setSelected] = useState(known);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => filterMunicipalities(query), [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function commit(nameValue: string) {
    setQuery(nameValue);
    setSelected(nameValue);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onQueryChange(next: string) {
    const nextSuggestions = filterMunicipalities(next);
    const exact = findExactMunicipality(next);
    setQuery(next);
    setSelected(exact ?? "");
    setOpen(true);
    if (exact) {
      setActiveIndex(Math.max(0, nextSuggestions.indexOf(exact)));
    } else {
      setActiveIndex(nextSuggestions.length > 0 ? 0 : -1);
    }
  }

  function onBlur() {
    const exact = findExactMunicipality(query);
    if (exact) {
      commit(exact);
      return;
    }
    setSelected("");
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => {
        if (suggestions.length === 0) return -1;
        return i < 0 ? 0 : Math.min(i + 1, suggestions.length - 1);
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => {
        if (suggestions.length === 0) return -1;
        return i <= 0 ? 0 : i - 1;
      });
      return;
    }
    if (event.key === "Enter" && open && activeIndex >= 0) {
      const choice = suggestions[activeIndex];
      if (choice) {
        event.preventDefault();
        commit(choice);
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="municipality-combobox" ref={rootRef}>
      <input type="hidden" name={name} value={selected} />
      <input
        id={id}
        type="text"
        role="combobox"
        className="analyse-form-input"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={query}
        placeholder="Sök kommun, t.ex. Sigtuna"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listboxId}
        aria-required={required || undefined}
        aria-activedescendant={
          open && activeIndex >= 0
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
        aria-invalid={ariaInvalid}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(suggestions.length > 0 ? 0 : -1);
        }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      {open && suggestions.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="municipality-combobox-list"
          onMouseDown={(e) => e.preventDefault()}
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={
                index === activeIndex
                  ? "municipality-combobox-option municipality-combobox-option--active"
                  : "municipality-combobox-option"
              }
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => commit(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      ) : null}
      {query.trim() && !selected ? (
        <p className="analyse-form-help municipality-combobox-hint">
          Välj en kommun från förslagen.
        </p>
      ) : null}
    </div>
  );
}
