"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";

import {
  confirmDocumentUploadAction,
  deleteDocumentAction,
  getDocumentDownloadUrlAction,
  moveDocumentAction,
  prepareDocumentUploadAction,
  type DocumentActionState,
} from "@/app/profil/actions";
import type { DashboardDocument } from "@/lib/properties/get-property-dashboard";
import {
  DOCUMENT_FOLDER_ORDER,
  DOCUMENT_TYPE_LABELS,
  displayNameFromFilePath,
  isDocumentType,
  type DocumentType,
} from "@/lib/properties/document-labels";

type Props = {
  propertyId: string;
  documents: DashboardDocument[];
  canEdit: boolean;
  canDelete: boolean;
};

const actionInitial: DocumentActionState = {};

const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.xls,.xlsx,application/pdf,image/*";

const MAX_BYTES = 50 * 1024 * 1024;

/** Custom drag payload för att flytta befintliga dokument mellan mappar. */
const DOC_DRAG_MIME = "application/x-byggello-document";

function docsInFolder(
  documents: DashboardDocument[],
  type: DocumentType,
): DashboardDocument[] {
  return documents
    .filter((doc) => {
      const key = isDocumentType(doc.type) ? doc.type : "ovrigt";
      return key === type;
    })
    .sort(
      (a, b) =>
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
    );
}

function folderCounts(
  documents: DashboardDocument[],
): Record<DocumentType, number> {
  const counts = Object.fromEntries(
    DOCUMENT_FOLDER_ORDER.map((t) => [t, 0]),
  ) as Record<DocumentType, number>;
  for (const doc of documents) {
    const key = isDocumentType(doc.type) ? doc.type : "ovrigt";
    counts[key] += 1;
  }
  return counts;
}

function dragHasFiles(dt: DataTransfer): boolean {
  return Array.from(dt.types).includes("Files");
}

function dragHasDocument(dt: DataTransfer): boolean {
  return Array.from(dt.types).includes(DOC_DRAG_MIME);
}

export function PropertyDocumentsSection({
  propertyId,
  documents,
  canEdit,
  canDelete,
}: Props) {
  const [activeFolder, setActiveFolder] = useState<DocumentType | null>(null);
  const counts = folderCounts(documents);

  return (
    <section
      className="profile-dashboard-panel"
      id="dokument"
      aria-labelledby="profile-docs-heading"
    >
      <h2 id="profile-docs-heading" className="profile-dashboard-heading">
        Dokument
      </h2>
      <p className="profile-dashboard-text">
        Öppna en mapp för att se filer och ladda upp. Flytta filer med
        &quot;Flytta till…&quot; eller dra dem till en annan mapp.
      </p>

      {activeFolder ? (
        <FolderView
          propertyId={propertyId}
          folder={activeFolder}
          documents={docsInFolder(documents, activeFolder)}
          canEdit={canEdit}
          canDelete={canDelete}
          onBack={() => setActiveFolder(null)}
          onOpenFolder={setActiveFolder}
        />
      ) : (
        <ul className="profile-doc-folders">
          {DOCUMENT_FOLDER_ORDER.map((type) => (
            <FolderCard
              key={type}
              propertyId={propertyId}
              type={type}
              count={counts[type]}
              canEdit={canEdit}
              canMove={canDelete}
              onOpen={() => setActiveFolder(type)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FolderCard({
  propertyId,
  type,
  count,
  canEdit,
  canMove,
  onOpen,
}: {
  propertyId: string;
  type: DocumentType;
  count: number;
  canEdit: boolean;
  canMove: boolean;
  onOpen: () => void;
}) {
  const router = useRouter();
  const [dragKind, setDragKind] = useState<"file" | "doc" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragDepth = useRef(0);

  const acceptDrop = canEdit || canMove;

  async function uploadFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("Filen får vara högst 50 MB.");
      return;
    }
    setBusy(true);
    try {
      const result = await runDocumentUpload({ propertyId, file, type });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Något gick fel vid uppladdning.");
    } finally {
      setBusy(false);
    }
  }

  async function moveDocument(documentId: string) {
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("property_id", propertyId);
      fd.set("document_id", documentId);
      fd.set("type", type);
      const result = await moveDocumentAction({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Kunde inte flytta dokumentet.");
    } finally {
      setBusy(false);
    }
  }

  let statusText = `${count} ${count === 1 ? "fil" : "filer"}`;
  if (busy) statusText = "Sparar…";
  else if (dragKind === "doc") statusText = "Släpp för att flytta hit";
  else if (dragKind === "file") statusText = "Släpp för att ladda upp";

  return (
    <li>
      <button
        type="button"
        className={`profile-doc-folder-card${dragKind ? " is-dragover" : ""}${busy ? " is-uploading" : ""}`}
        onClick={onOpen}
        onDragEnter={
          acceptDrop
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragDepth.current += 1;
                if (canMove && dragHasDocument(e.dataTransfer)) {
                  setDragKind("doc");
                } else if (canEdit && dragHasFiles(e.dataTransfer)) {
                  setDragKind("file");
                }
              }
            : undefined
        }
        onDragLeave={
          acceptDrop
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragDepth.current -= 1;
                if (dragDepth.current <= 0) {
                  dragDepth.current = 0;
                  setDragKind(null);
                }
              }
            : undefined
        }
        onDragOver={
          acceptDrop
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
              }
            : undefined
        }
        onDrop={
          acceptDrop
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragDepth.current = 0;
                setDragKind(null);
                const docId = e.dataTransfer.getData(DOC_DRAG_MIME);
                if (docId && canMove) {
                  void moveDocument(docId);
                  return;
                }
                const file = e.dataTransfer.files?.[0];
                if (file && canEdit) void uploadFile(file);
              }
            : undefined
        }
        disabled={busy}
      >
        <span className="profile-doc-folder-card-main">
          <span className="profile-doc-folder-name">
            {DOCUMENT_TYPE_LABELS[type]}
          </span>
          <span className="profile-doc-folder-count">{statusText}</span>
        </span>
        <span className="profile-doc-folder-card-hint" aria-hidden>
          →
        </span>
      </button>
      {error ? (
        <p className="profile-ownership-error" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function FolderView({
  propertyId,
  folder,
  documents,
  canEdit,
  canDelete,
  onBack,
  onOpenFolder,
}: {
  propertyId: string;
  folder: DocumentType;
  documents: DashboardDocument[];
  canEdit: boolean;
  canDelete: boolean;
  onBack: () => void;
  onOpenFolder: (type: DocumentType) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [note, setNote] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const otherFolders = DOCUMENT_FOLDER_ORDER.filter((t) => t !== folder);

  async function uploadFile(file: File, noteText: string) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("Filen får vara högst 50 MB.");
      return;
    }
    setUploading(true);
    try {
      const result = await runDocumentUpload({
        propertyId,
        file,
        type: folder,
        note: noteText,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setNote("");
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      setError("Något gick fel vid uppladdning.");
    } finally {
      setUploading(false);
    }
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    setPendingFile(file);
    setError(null);
  }

  return (
    <div className="profile-doc-folder-view">
      <button
        type="button"
        className="profile-edit-link profile-doc-back"
        onClick={onBack}
      >
        ← Alla mappar
      </button>
      <h3 className="profile-doc-folder-view-title">
        {DOCUMENT_TYPE_LABELS[folder]}
      </h3>

      {documents.length > 0 ? (
        <ul className="profile-doc-list">
          {documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              propertyId={propertyId}
              doc={doc}
              canDelete={canDelete}
              onMoved={(next) => onOpenFolder(next)}
            />
          ))}
        </ul>
      ) : (
        <p className="profile-dashboard-text">Inga filer i den här mappen ännu.</p>
      )}

      {canDelete && documents.length > 0 ? (
        <div className="profile-doc-move-targets">
          <p className="profile-doc-move-targets-label">
            Dra en fil hit för att flytta:
          </p>
          <ul className="profile-doc-move-target-list">
            {otherFolders.map((type) => (
              <MoveTarget
                key={type}
                propertyId={propertyId}
                type={type}
                onMoved={() => onOpenFolder(type)}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {canEdit ? (
        <div
          className={`profile-doc-dropzone${dragOver ? " is-dragover" : ""}`}
          onDragEnter={(e) => {
            if (!dragHasFiles(e.dataTransfer) || dragHasDocument(e.dataTransfer)) {
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            dragDepth.current += 1;
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dragDepth.current -= 1;
            if (dragDepth.current <= 0) {
              dragDepth.current = 0;
              setDragOver(false);
            }
          }}
          onDragOver={(e) => {
            if (!dragHasFiles(e.dataTransfer) || dragHasDocument(e.dataTransfer)) {
              return;
            }
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            if (dragHasDocument(e.dataTransfer)) return;
            e.preventDefault();
            e.stopPropagation();
            dragDepth.current = 0;
            setDragOver(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
        >
          <p className="profile-doc-dropzone-text">
            {dragOver
              ? "Släpp filen här"
              : pendingFile
                ? pendingFile.name
                : "Dra och släpp en fil här, eller välj fil"}
          </p>
          <input
            ref={fileRef}
            type="file"
            className="profile-doc-file-input"
            disabled={uploading}
            accept={ACCEPT}
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <button
            type="button"
            className="home-btn home-btn-ghost"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            Välj fil
          </button>

          <label className="profile-part-field">
            <span>Anteckning (valfritt)</span>
            <input
              type="text"
              className="analyse-form-input"
              maxLength={200}
              disabled={uploading}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="t.ex. Överlåtelse 2024"
            />
          </label>

          <button
            type="button"
            className="home-btn home-btn-primary"
            disabled={uploading || !pendingFile}
            onClick={() => {
              if (pendingFile) void uploadFile(pendingFile, note.trim());
            }}
          >
            {uploading ? "Laddar upp…" : "Ladda upp"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="profile-ownership-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function MoveTarget({
  propertyId,
  type,
  onMoved,
}: {
  propertyId: string;
  type: DocumentType;
  onMoved: () => void;
}) {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragDepth = useRef(0);

  async function moveDocument(documentId: string) {
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("property_id", propertyId);
      fd.set("document_id", documentId);
      fd.set("type", type);
      const result = await moveDocumentAction({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onMoved();
    } catch {
      setError("Kunde inte flytta dokumentet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        className={`profile-doc-move-target${dragOver ? " is-dragover" : ""}`}
        onDragEnter={(e) => {
          if (!dragHasDocument(e.dataTransfer)) return;
          e.preventDefault();
          e.stopPropagation();
          dragDepth.current += 1;
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setDragOver(false);
          }
        }}
        onDragOver={(e) => {
          if (!dragHasDocument(e.dataTransfer)) return;
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragDepth.current = 0;
          setDragOver(false);
          const docId = e.dataTransfer.getData(DOC_DRAG_MIME);
          if (docId) void moveDocument(docId);
        }}
      >
        {busy ? "Flyttar…" : DOCUMENT_TYPE_LABELS[type]}
      </div>
      {error ? (
        <p className="profile-ownership-error" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

async function runDocumentUpload({
  propertyId,
  file,
  type,
  note,
}: {
  propertyId: string;
  file: File;
  type: DocumentType;
  note?: string;
}): Promise<{ error?: string }> {
  const prepFd = new FormData();
  prepFd.set("property_id", propertyId);
  prepFd.set("file_name", file.name);
  prepFd.set("file_size", String(file.size));
  prepFd.set("type", type);

  const prep = await prepareDocumentUploadAction({}, prepFd);
  if (prep.error || !prep.signedUrl || !prep.path) {
    return { error: prep.error ?? "Kunde inte förbereda uppladdning." };
  }

  const uploadRes = await fetch(prep.signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!uploadRes.ok) {
    return { error: "Uppladdningen misslyckades. Försök igen." };
  }

  const confirmFd = new FormData();
  confirmFd.set("property_id", propertyId);
  confirmFd.set("file_path", prep.path);
  confirmFd.set("type", type);
  if (note) confirmFd.set("note", note);

  const confirmed = await confirmDocumentUploadAction({}, confirmFd);
  if (confirmed.error) return { error: confirmed.error };
  return {};
}

function DocumentRow({
  propertyId,
  doc,
  canDelete,
  onMoved,
}: {
  propertyId: string;
  doc: DashboardDocument;
  canDelete: boolean;
  onMoved?: (next: DocumentType) => void;
}) {
  const router = useRouter();
  const [dlError, setDlError] = useState<string | null>(null);
  const [dlPending, setDlPending] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [movePending, setMovePending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [delState, delAction, delPending] = useActionState(
    deleteDocumentAction,
    actionInitial,
  );

  const currentType: DocumentType = isDocumentType(doc.type)
    ? doc.type
    : "ovrigt";

  async function openDocument() {
    setDlError(null);
    setDlPending(true);
    try {
      const fd = new FormData();
      fd.set("property_id", propertyId);
      fd.set("document_id", doc.id);
      const result = await getDocumentDownloadUrlAction({}, fd);
      if (result.error || !result.url) {
        setDlError(result.error ?? "Kunde inte öppna filen.");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } finally {
      setDlPending(false);
    }
  }

  async function moveTo(nextType: DocumentType) {
    setMoveError(null);
    setMovePending(true);
    try {
      const fd = new FormData();
      fd.set("property_id", propertyId);
      fd.set("document_id", doc.id);
      fd.set("type", nextType);
      const result = await moveDocumentAction({}, fd);
      if (result.error) {
        setMoveError(result.error);
        return;
      }
      router.refresh();
      onMoved?.(nextType);
    } catch {
      setMoveError("Kunde inte flytta dokumentet.");
    } finally {
      setMovePending(false);
    }
  }

  return (
    <li
      className={`profile-doc-item${dragging ? " is-dragging" : ""}`}
      draggable={canDelete}
      onDragStart={
        canDelete
          ? (e) => {
              e.dataTransfer.setData(DOC_DRAG_MIME, doc.id);
              e.dataTransfer.effectAllowed = "move";
              setDragging(true);
            }
          : undefined
      }
      onDragEnd={
        canDelete
          ? () => {
              setDragging(false);
            }
          : undefined
      }
    >
      <div className="profile-doc-item-main">
        <p className="profile-doc-title">
          {displayNameFromFilePath(doc.file_path)}
        </p>
        <p className="profile-doc-meta">
          {new Date(doc.uploaded_at).toLocaleDateString("sv-SE")}
          {doc.note ? ` · ${doc.note}` : null}
          {canDelete ? " · Dra för att flytta" : null}
        </p>
      </div>
      <div className="profile-doc-item-actions">
        <button
          type="button"
          className="profile-edit-link"
          disabled={dlPending}
          onClick={() => void openDocument()}
        >
          {dlPending ? "Öppnar…" : "Öppna"}
        </button>
        {canDelete ? (
          <label className="profile-doc-move">
            <span className="visually-hidden">Flytta till mapp</span>
            <select
              className="analyse-form-input profile-doc-move-select"
              disabled={movePending || delPending}
              value=""
              onChange={(e) => {
                const next = e.target.value;
                if (!isDocumentType(next)) return;
                void moveTo(next);
              }}
            >
              <option value="" disabled>
                {movePending ? "Flyttar…" : "Flytta till…"}
              </option>
              {DOCUMENT_FOLDER_ORDER.filter((t) => t !== currentType).map(
                (t) => (
                  <option key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t]}
                  </option>
                ),
              )}
            </select>
          </label>
        ) : null}
        {canDelete ? (
          <form
            action={(fd) => {
              delAction(fd);
              router.refresh();
            }}
          >
            <input type="hidden" name="property_id" value={propertyId} />
            <input type="hidden" name="document_id" value={doc.id} />
            <button
              type="submit"
              className="profile-todo-note-remove"
              disabled={delPending || movePending}
            >
              Ta bort
            </button>
          </form>
        ) : null}
      </div>
      {dlError || moveError || delState.error ? (
        <p className="profile-ownership-error" role="alert">
          {dlError || moveError || delState.error}
        </p>
      ) : null}
    </li>
  );
}
