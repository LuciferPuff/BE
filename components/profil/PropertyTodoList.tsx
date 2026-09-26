"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

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
  const [noteOpen, setNoteOpen] = useState(Boolean(todo.note));

  return (
    <li
      className={
        todo.completed
          ? "profile-todo-item profile-todo-item--done"
          : "profile-todo-item"
      }
    >
      <div className="profile-todo-main">
        {canEdit ? (
          <form action={formAction}>
            <input type="hidden" name="property_id" value={propertyId} />
            <input type="hidden" name="task_key" value={todo.key} />
            <input
              type="hidden"
              name="completed"
              value={todo.completed ? "0" : "1"}
            />
            {todo.note ? (
              <input type="hidden" name="note" value={todo.note} />
            ) : null}
            <button
              type="submit"
              className="profile-todo-check"
              disabled={pending}
              aria-pressed={todo.completed}
              aria-label={
                todo.completed ? "Markera som öppen" : "Markera som klar"
              }
            >
              {todo.completed ? "✓" : ""}
            </button>
          </form>
        ) : (
          <span
            className="profile-todo-check profile-todo-check--static"
            aria-hidden
          >
            {todo.completed ? "✓" : ""}
          </span>
        )}
        <div className="profile-todo-copy">
          <p className="profile-todo-title">{todo.title}</p>
          <p className="profile-todo-desc">{todo.description}</p>
          {todo.href ? (
            <Link href={todo.href} className="profile-todo-link">
              Öppna →
            </Link>
          ) : null}
          {todo.note ? (
            <p className="profile-todo-note">Anteckning: {todo.note}</p>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="profile-todo-note-toggle"
              onClick={() => setNoteOpen((v) => !v)}
            >
              {noteOpen ? "Dölj anteckning" : "Anteckning"}
            </button>
          ) : null}
          {canEdit && noteOpen ? (
            <form action={formAction} className="profile-todo-note-form">
              <input type="hidden" name="property_id" value={propertyId} />
              <input type="hidden" name="task_key" value={todo.key} />
              <input
                type="hidden"
                name="completed"
                value={todo.completed ? "1" : "0"}
              />
              <input
                type="text"
                name="note"
                className="analyse-form-input"
                defaultValue={todo.note ?? ""}
                placeholder="Kort anteckning"
                disabled={pending}
                maxLength={200}
              />
              <button
                type="submit"
                className="profile-edit-link"
                disabled={pending}
              >
                Spara
              </button>
            </form>
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
