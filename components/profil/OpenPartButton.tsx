"use client";

import type { ReactNode } from "react";

const OPEN_PART_EVENT = "byggello:open-part";

export function openPropertyPart(partId: string) {
  window.dispatchEvent(
    new CustomEvent(OPEN_PART_EVENT, { detail: { partId } }),
  );
  document
    .getElementById("husets-delar")
    ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

export function subscribeOpenPropertyPart(
  handler: (partId: string) => void,
): () => void {
  function onOpen(event: Event) {
    const partId = (event as CustomEvent<{ partId?: string }>).detail?.partId;
    if (partId) handler(partId);
  }
  window.addEventListener(OPEN_PART_EVENT, onOpen);
  return () => window.removeEventListener(OPEN_PART_EVENT, onOpen);
}

type Props = {
  partId: string;
  label?: string;
  children?: ReactNode;
  className?: string;
};

/** Öppnar husdelspanelen utan full sidladdning. */
export function OpenPartButton({ partId, label, children, className }: Props) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => openPropertyPart(partId)}
    >
      {children ?? label}
    </button>
  );
}
