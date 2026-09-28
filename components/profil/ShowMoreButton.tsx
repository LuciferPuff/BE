"use client";

type Props = {
  onClick: () => void;
  pending?: boolean;
  label?: string;
};

export function ShowMoreButton({
  onClick,
  pending = false,
  label = "Visa fler",
}: Props) {
  return (
    <button
      type="button"
      className="profile-show-more"
      onClick={onClick}
      disabled={pending}
    >
      {pending ? "Laddar…" : label}
    </button>
  );
}
