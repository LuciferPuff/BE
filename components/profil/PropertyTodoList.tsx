"use client";

import Link from "next/link";
import { useActionState, useOptimistic, useState } from "react";

import {
  updateTodoStateAction,
  type UpdateTodoState,
} from "@/app/profil/actions";
import {
  OpenPartButton,
} from "@/components/profil/OpenPartButton";
import { partIdFromDelHref } from "@/lib/properties/part-href";
import type { PropertyTodoItem } from "@/lib/properties/build-todos";

type Props = {
  propertyId: string;
  todos: PropertyTodoItem[];
  canEdit: boolean;
};

const initialState: UpdateTodoState = {};
const VISIBLE_LIMIT = 5;

export function PropertyTodoList({ propertyId, todos, canEdit }: Props) {
  const [showAll, setShowAll] = useState(false);
  const openCount = todos.filter((t) => !t.completed).length;
  const visible = showAll ? todos : todos.slice(0, VISIBLE_LIMIT);
  const hiddenCount = Math.max(0, todos.length - VISIBLE_LIMIT);

  return (
    <section
      className="profile-dashboard-panel"
      id="att-gora"
      aria-labelledby="profile-todo-heading"
    >
      <h2 id="profile-todo-heading" className="profile-dashboard-heading">
        Att göra
      </h2>
      <p className="profile-dashboard-text">
        {openCount === 0
          ? "Inga öppna punkter just nu."
          : openCount === 1
            ? "1 öppen punkt."
            : `${openCount} öppna punkter.`}
      </p>
      <ul className="profile-todo-list">
        {visible.map((todo) => (
          <TodoRow
            key={todo.key}
            propertyId={propertyId}
            todo={todo}
            canEdit={canEdit}
          />
        ))}
      </ul>
      {!showAll && hiddenCount > 0 ? (
        <button
          type="button"
          className="profile-todo-more"
          onClick={() => setShowAll(true)}
        >
          Visa fler ({hiddenCount})
        </button>
      ) : null}
    </section>
  );
}

function TodoRow({
  propertyId,
  todo,
  canEdit,
}: {
  propertyId: string;
  todo: PropertyTodoItem;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateTodoStateAction,
    initialState,
  );
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(
    todo.completed,
    (_current, next: boolean) => next,
  );

  const copy = (
    <div className="profile-todo-copy">
      <p className="profile-todo-title">{todo.title}</p>
      <p className="profile-todo-desc">{todo.description}</p>
      {state.error ? (
        <p className="profile-ownership-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );

  return (
    <li
      className={
        optimisticCompleted
          ? "profile-todo-item profile-todo-item--done"
          : "profile-todo-item"
      }
      data-pending={pending ? "true" : undefined}
    >
      <div className="profile-todo-main">
        {todo.kind === "manual" && canEdit ? (
          <form
            action={(formData) => {
              const next = formData.get("completed") === "1";
              setOptimisticCompleted(next);
              formAction(formData);
            }}
          >
            <input type="hidden" name="property_id" value={propertyId} />
            <input type="hidden" name="task_key" value={todo.key} />
            <input
              type="hidden"
              name="completed"
              value={optimisticCompleted ? "0" : "1"}
            />
            <button
              type="submit"
              className="profile-todo-check"
              aria-pressed={optimisticCompleted}
              aria-busy={pending}
              aria-label={
                optimisticCompleted
                  ? "Markera som öppen"
                  : "Markera som klar"
              }
            >
              {optimisticCompleted ? "✓" : ""}
            </button>
          </form>
        ) : (
          <span
            className={
              optimisticCompleted
                ? "profile-todo-check profile-todo-check--static profile-todo-check--auto"
                : "profile-todo-check profile-todo-check--static"
            }
            aria-hidden
          >
            {optimisticCompleted ? "✓" : ""}
          </span>
        )}
        {todo.href ? (
          (() => {
            const partId = partIdFromDelHref(todo.href);
            if (partId) {
              return (
                <OpenPartButton
                  partId={partId}
                  className="profile-todo-row-link"
                >
                  {copy}
                </OpenPartButton>
              );
            }
            return (
              <Link
                href={todo.href}
                className="profile-todo-row-link"
                scroll={false}
              >
                {copy}
              </Link>
            );
          })()
        ) : (
          copy
        )}
      </div>
    </li>
  );
}
