"use client";

import Link from "next/link";
import { useActionState, useOptimistic } from "react";

import {
  updateTodoStateAction,
  type UpdateTodoState,
} from "@/app/profil/actions";
import type { PropertyTodoItem } from "@/lib/properties/build-todos";
import type { TodoNoteEntry } from "@/lib/properties/todo-notes";

type Props = {
  propertyId: string;
  todos: PropertyTodoItem[];
  canEdit: boolean;
};

const initialState: UpdateTodoState = {};

type OptimisticTodo = {
  completed: boolean;
  notes: TodoNoteEntry[];
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
    { completed: todo.completed, notes: todo.notes },
    (_current, next) => next,
  );

  function runWithOptimistic(
    formData: FormData,
    next: OptimisticTodo,
  ): void {
    setOptimistic(next);
    formAction(formData);
  }

  const noteCount = optimistic.notes.length;

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
                notes: optimistic.notes,
              });
            }}
          >
            <input type="hidden" name="property_id" value={propertyId} />
            <input type="hidden" name="task_key" value={todo.key} />
            <input type="hidden" name="note_op" value="toggle" />
            <input
              type="hidden"
              name="completed"
              value={optimistic.completed ? "0" : "1"}
            />
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

          {noteCount > 0 ? (
            <ul className="profile-todo-notes">
              {optimistic.notes.map((note) => (
                <li key={note.id} className="profile-todo-note-row">
                  <p className="profile-todo-note">{note.text}</p>
                  {canEdit ? (
                    <form
                      action={(formData) => {
                        runWithOptimistic(formData, {
                          completed: optimistic.completed,
                          notes: optimistic.notes.filter((n) => n.id !== note.id),
                        });
                      }}
                    >
                      <input
                        type="hidden"
                        name="property_id"
                        value={propertyId}
                      />
                      <input type="hidden" name="task_key" value={todo.key} />
                      <input type="hidden" name="note_op" value="remove" />
                      <input type="hidden" name="note_id" value={note.id} />
                      <input
                        type="hidden"
                        name="completed"
                        value={optimistic.completed ? "1" : "0"}
                      />
                      <button
                        type="submit"
                        className="profile-todo-note-remove"
                      >
                        Ta bort
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {canEdit ? (
            <details className="profile-todo-note-details">
              <summary className="profile-todo-note-toggle">
                Lägg till anteckning
              </summary>
              <form
                className="profile-todo-note-form"
                action={(formData) => {
                  const raw = formData.get("note_text");
                  const text =
                    typeof raw === "string" ? raw.trim() : "";
                  if (!text) return;
                  runWithOptimistic(formData, {
                    completed: optimistic.completed,
                    notes: [
                      ...optimistic.notes,
                      {
                        id: `tmp-${Date.now()}`,
                        text,
                        createdAt: new Date().toISOString(),
                      },
                    ],
                  });
                }}
              >
                <input type="hidden" name="property_id" value={propertyId} />
                <input type="hidden" name="task_key" value={todo.key} />
                <input type="hidden" name="note_op" value="add" />
                <input
                  type="hidden"
                  name="completed"
                  value={optimistic.completed ? "1" : "0"}
                />
                <input
                  key={noteCount}
                  type="text"
                  name="note_text"
                  className="analyse-form-input"
                  defaultValue=""
                  placeholder="Ny anteckning"
                  maxLength={200}
                  aria-label="Ny anteckning"
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
