"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createPropertyEventAction,
  deletePropertyEventAction,
  type EventActionState,
} from "@/app/profil/actions";
import type { DashboardTimelineItem } from "@/lib/properties/get-property-dashboard";
import {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
} from "@/lib/properties/document-labels";

type Props = {
  propertyId: string;
  timeline: DashboardTimelineItem[];
  canEdit: boolean;
  canDelete: boolean;
};

const initial: EventActionState = {};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function PropertyTimelineSection({
  propertyId,
  timeline,
  canEdit,
  canDelete,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createPropertyEventAction,
    initial,
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section
      className="profile-dashboard-panel"
      aria-labelledby="profile-timeline-heading"
    >
      <h2 id="profile-timeline-heading" className="profile-dashboard-heading">
        Tidslinje
      </h2>
      <ol className="profile-timeline">
        {timeline.length === 0 ? (
          <li className="profile-timeline-item">
            <span>Inga händelser ännu.</span>
          </li>
        ) : (
          timeline.map((item) => (
            <li key={item.key} className="profile-timeline-item">
              <time dateTime={item.date}>{formatDate(item.date)}</time>
              <span className="profile-timeline-row">
                {item.href ? (
                  <Link href={item.href}>{item.label}</Link>
                ) : (
                  <span>{item.label}</span>
                )}
                {canDelete && item.kind === "event" ? (
                  <DeleteEventButton
                    propertyId={propertyId}
                    eventId={item.key.replace(/^event-/, "")}
                  />
                ) : null}
              </span>
            </li>
          ))
        )}
      </ol>

      {canEdit ? (
        <form action={formAction} className="profile-event-form">
          <p className="profile-part-verify-label">Lägg till händelse</p>
          <input type="hidden" name="property_id" value={propertyId} />
          <label className="profile-part-field">
            <span>Typ</span>
            <select
              name="event_type"
              className="analyse-form-input"
              required
              disabled={pending}
              defaultValue="ovrigt"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="profile-part-field">
            <span>Datum</span>
            <input
              type="date"
              name="event_date"
              className="analyse-form-input"
              required
              disabled={pending}
              defaultValue={today}
            />
          </label>
          <label className="profile-part-field">
            <span>Beskrivning</span>
            <input
              type="text"
              name="description"
              className="analyse-form-input"
              maxLength={300}
              disabled={pending}
              placeholder="t.ex. Nytt tak"
            />
          </label>
          <label className="profile-part-field">
            <span>Kostnad (valfritt)</span>
            <input
              type="text"
              name="cost"
              className="analyse-form-input"
              inputMode="decimal"
              disabled={pending}
              placeholder="t.ex. 85000"
            />
          </label>
          <button
            type="submit"
            className="home-btn home-btn-primary"
            disabled={pending}
          >
            {pending ? "Sparar…" : "Spara händelse"}
          </button>
          {state.error ? (
            <p className="profile-ownership-error" role="alert">
              {state.error}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}

function DeleteEventButton({
  propertyId,
  eventId,
}: {
  propertyId: string;
  eventId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deletePropertyEventAction,
    initial,
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="profile-timeline-delete">
      <input type="hidden" name="property_id" value={propertyId} />
      <input type="hidden" name="event_id" value={eventId} />
      <button
        type="submit"
        className="profile-todo-note-remove"
        disabled={pending}
        aria-label="Ta bort händelse"
      >
        Ta bort
      </button>
      {state.error ? (
        <span className="profile-ownership-error" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
