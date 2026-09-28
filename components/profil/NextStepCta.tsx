"use client";

import Link from "next/link";

import { OpenPartButton } from "@/components/profil/OpenPartButton";
import { partIdFromDelHref } from "@/lib/properties/part-href";

type Props = {
  href: string;
  label: string;
};

/** CTA för Nästa steg – öppnar husdel utan sidladdning när länken är ?del=. */
export function NextStepCta({ href, label }: Props) {
  const partId = partIdFromDelHref(href);
  if (partId) {
    return (
      <OpenPartButton
        partId={partId}
        label={label}
        className="home-btn home-btn-primary"
      />
    );
  }
  return (
    <Link href={href} className="home-btn home-btn-primary">
      {label}
    </Link>
  );
}
