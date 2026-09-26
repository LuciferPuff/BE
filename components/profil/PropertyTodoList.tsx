"use client";

import Link from "next/link";
import { useActionState, useOptimistic } from "react";

import {
  updateTodoStateAction,
  type UpdateTodoState,
} from "@/app/profil/actions";
import type { PropertyTodoItem } from "@/lib/properties/build-todos";

type Props = {
  propertyId: string;
  todos: PropertyTodoItem[];
  canEdit: boolean;
};

const initialState: UpdateTodoState = {};

type OptimisticTodo = {
  completed: boolean;
  note: string | null;
};

export function PropertyTodoList({ propertyId, todos, canEdit }: Props) {
  const openCount = todos.filter((t) => !t.completed).length;

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
          : `${openCount} öppna punkt${openCount === 1 ? "" : "er"}.`}
      </p>
      <ul className="profile-todo-list">
        {todos.map((todo) => (
          <TodoRow
            key={todo.key}
            propertyId={propertyId}
            todo={todo}
            canEdit={canEdit}
          />
        ))}
      </ul>
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
  const [optimistic, setOptimistic] = useOptimistic<
    OptimisticTodo,
    OptimisticTodo
  >(
    { completed: todo.completed, note: todo.note },
    (_current, next) => next,
  );

  function runWithOptimistic(
    formData: FormData,
    next: OptimisticTodo,
  ): void {
    setOptimistic(next);
    formAction(formData);
  }

  return (
    <li
      className={
        optimistic.completed
          ? "profile-todo-item profile-todo-item--done"
          : "profile-todo-item"
      }
      data-pending={pending ? "true" : undefined}
    >
      <div className="profile-todo-main">
        {canEdit ? (
          <form
            action={(formData) => {
              const nextCompleted = formData.get("completed") === "1";
              runWithOptimistic(formData, {
                completed: nextCompleted,
                note: optimistic.note,
              });
            }}
          >
            <input type="hidden" name="property_id" value={propertyId} />
            <input type="hidden" name="task_key" value={todo.key} />
            <input
              type="hidden"
              name="completed"
              value={optimistic.completed ? "0" : "1"}
            />
            <input type="hidden" name="note" value={optimistic.note ?? ""} />
            <button
              type="submit"
              className="profile-todo-check"
              aria-pressed={optimistic.completed}
              aria-busy={pending}
              aria-label={
                optimistic.completed
                  ? "Markera som öppen"
                  : "Markera som klar"
              }
            >
              {optimistic.completed ? "✓" : ""}
            </button>
          </form>
        ) : (
          <span
            className="profile-todo-check profile-todo-check--static"
            aria-hidden
          >
            {optimistic.completed ? "✓" : ""}
          </span>
        )}
        <div className="profile-todo-copy">
          <p className="profile-todo-title">{todo.title}</p>
          <p className="profile-todo-desc">{todo.description}</p>
          {todo.href ? (
            <Link href={todo.href} className="profile-todo-link" scroll={false}>
              Öppna →
            </Link>
          ) : null}
          {optimistic.note && !canEdit ? (
            <p className="profile-todo-note">Anteckning: {optimistic.note}</p>
          ) : null}
          {canEdit ? (
            <details className="profile-todo-note-details">
              <summary className="profile-todo-note-toggle">
                {optimistic.note ? "Anteckning" : "Lägg till anteckning"}
              </summary>
              {optimistic.note ? (
                <p className="profile-todo-note">{optimistic.note}</p>
              ) : null}
              <form
                className="profile-todo-note-form"
                action={(formData) => {
                  const raw = formData.get("note");
                  const note =
                    typeof raw === "string" && raw.trim() ? raw.trim() : null;
                  runWithOptimistic(formData, {
                    completed: optimistic.completed,
                    note,
                  });
                }}
              >
                <input type="hidden" name="property_id" value={propertyId} />
                <input type="hidden" name="task_key" value={todo.key} />
                <input
                  type="hidden"
                  name="completed"
                  value={optimistic.completed ? "1" : "0"}
                />
                <input
                  type="text"
                  name="note"
                  className="analyse-form-input"
                  defaultValue={optimistic.note ?? ""}
                  placeholder="Kort anteckning"
                  maxLength={200}
                  aria-label="Anteckning"
                />
                <button type="submit" className="profile-edit-link">
                  Spara
                </button>
              </form>
            </details>
          ) : null}
          {state.error ? (
            <p className="profile-ownership-error" role="alert">
              {state.error}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
