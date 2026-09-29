"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  addPropertyMemberAction,
  removePropertyMemberAction,
  transferPropertyOwnershipAction,
  updatePropertyMemberRoleAction,
  type PropertyMemberAccessState,
} from "@/app/profil/actions";
import type { PropertyMember } from "@/lib/properties/get-property-members";
import {
  PROPERTY_ROLES,
  propertyRoleLabel,
  type PropertyRole,
} from "@/lib/properties/labels";

type Props = {
  propertyId: string;
  currentUserId: string;
  canManage: boolean;
  members: PropertyMember[];
};

const initial: PropertyMemberAccessState = {};

function displayName(member: PropertyMember): string {
  const name = member.fullName?.trim();
  if (name) return name;
  const email = member.email?.trim();
  if (email) return email;
  return "Okänd användare";
}

function roleHint(role: PropertyRole): string {
  if (role === "agare") return "Kan styra allt, inklusive vem som har tillgång.";
  if (role === "medlem") return "Kan uppdatera husdelar och dokument.";
  return "Kan titta, men inte ändra.";
}

export function PropertyMembersSection({
  propertyId,
  currentUserId,
  canManage,
  members,
}: Props) {
  const ownerCount = members.filter((m) => m.role === "agare").length;
  const alone = members.length <= 1;

  return (
    <section
      className="profile-dashboard-panel"
      aria-labelledby="profile-access-heading"
    >
      <h2 id="profile-access-heading" className="profile-dashboard-heading">
        Vem har tillgång
      </h2>
      <p className="profile-dashboard-text">
        {alone
          ? "Bara du har tillgång just nu. Du kan bjuda in någon som redan har Byggello-konto."
          : "De här personerna kan öppna den här fastighetsprofilen."}
      </p>

      <ul className="profile-access-list">
        {members.map((member) => {
          const isYou = member.userId === currentUserId;
          const isSoleOwner = member.role === "agare" && ownerCount <= 1;
          const canTransfer = canManage && !isYou;
          return (
            <li key={member.memberId} className="profile-access-item">
              <div className="profile-access-copy">
                <p className="profile-access-name">
                  {displayName(member)}
                  {isYou ? (
                    <span className="profile-access-you"> (du)</span>
                  ) : null}
                </p>
                {member.fullName?.trim() && member.email?.trim() ? (
                  <p className="profile-access-email">{member.email}</p>
                ) : null}
                <p className="profile-access-hint">{roleHint(member.role)}</p>
              </div>

              {canManage ? (
                <MemberControls
                  propertyId={propertyId}
                  member={member}
                  isSoleOwner={isSoleOwner}
                  canTransfer={canTransfer}
                />
              ) : (
                <p className="profile-access-role-static">
                  {propertyRoleLabel(member.role)}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {canManage ? <AddMemberForm propertyId={propertyId} /> : null}
    </section>
  );
}

function MemberControls({
  propertyId,
  member,
  isSoleOwner,
  canTransfer,
}: {
  propertyId: string;
  member: PropertyMember;
  isSoleOwner: boolean;
  canTransfer: boolean;
}) {
  const [roleState, roleAction, rolePending] = useActionState(
    updatePropertyMemberRoleAction,
    initial,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removePropertyMemberAction,
    initial,
  );
  const [transferState, transferAction, transferPending] = useActionState(
    transferPropertyOwnershipAction,
    initial,
  );
  const pending = rolePending || removePending || transferPending;
  const error = roleState.error || removeState.error || transferState.error;
  const who = displayName(member);

  return (
    <div className="profile-access-controls">
      <form action={roleAction} className="profile-access-role-form">
        <input type="hidden" name="property_id" value={propertyId} />
        <input type="hidden" name="member_id" value={member.memberId} />
        <label className="visually-hidden" htmlFor={`role-${member.memberId}`}>
          Roll för {who}
        </label>
        <select
          id={`role-${member.memberId}`}
          name="role"
          className="profile-access-select"
          defaultValue={member.role}
          disabled={pending || isSoleOwner}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          {PROPERTY_ROLES.map((role) => (
            <option key={role} value={role}>
              {propertyRoleLabel(role)}
            </option>
          ))}
        </select>
      </form>
      {canTransfer ? (
        <form
          action={transferAction}
          onSubmit={(e) => {
            const ok = window.confirm(
              `Överlåt ägarskapet till ${who}?\n\n` +
                "Du förlorar ägarskapet och blir medlem i stället. " +
                "Du kan fortfarande se och uppdatera huset, men inte längre styra vem som har tillgång.",
            );
            if (!ok) e.preventDefault();
          }}
        >
          <input type="hidden" name="property_id" value={propertyId} />
          <input type="hidden" name="member_id" value={member.memberId} />
          <button
            type="submit"
            className="profile-access-transfer"
            disabled={pending}
          >
            {transferPending ? "Överlåter…" : "Överlåt ägarskap"}
          </button>
        </form>
      ) : null}
      <form action={removeAction}>
        <input type="hidden" name="property_id" value={propertyId} />
        <input type="hidden" name="member_id" value={member.memberId} />
        <button
          type="submit"
          className="profile-access-remove"
          disabled={pending || isSoleOwner}
          title={
            isSoleOwner
              ? "Du kan inte ta bort den sista ägaren"
              : "Ta bort åtkomst"
          }
        >
          {removePending ? "Tar bort…" : "Ta bort"}
        </button>
      </form>
      {error ? (
        <p className="profile-ownership-error" role="alert">
          {error}
        </p>
      ) : null}
      {transferState.ok ? (
        <p className="profile-teaser-done" role="status">
          Ägarskapet är överlåtet ✓
        </p>
      ) : null}
    </div>
  );
}

function AddMemberForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, pending] = useActionState(
    addPropertyMemberAction,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="profile-access-add"
    >
      <input type="hidden" name="property_id" value={propertyId} />
      <p className="profile-access-add-title">Bjud in</p>
      <p className="profile-dashboard-text profile-access-add-help">
        Ange e-posten till ett befintligt konto. Gäst kan titta; medlem kan
        uppdatera.
      </p>
      <div className="profile-access-add-row">
        <label className="visually-hidden" htmlFor="access-email">
          E-post
        </label>
        <input
          id="access-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="namn@exempel.se"
          className="analyse-form-input profile-access-email-input"
          disabled={pending}
        />
        <label className="visually-hidden" htmlFor="access-role">
          Roll
        </label>
        <select
          id="access-role"
          name="role"
          className="profile-access-select"
          defaultValue="gast"
          disabled={pending}
        >
          <option value="gast">{propertyRoleLabel("gast")}</option>
          <option value="medlem">{propertyRoleLabel("medlem")}</option>
          <option value="agare">{propertyRoleLabel("agare")}</option>
        </select>
        <button type="submit" className="profile-edit-link" disabled={pending}>
          {pending ? "Sparar…" : "Lägg till"}
        </button>
      </div>
      {state.error ? (
        <p className="profile-ownership-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="profile-teaser-done" role="status">
          Tillgång tillagd ✓
        </p>
      ) : null}
    </form>
  );
}
