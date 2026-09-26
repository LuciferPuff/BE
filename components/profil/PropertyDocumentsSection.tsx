"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";

import {
  confirmDocumentUploadAction,
  deleteDocumentAction,
  getDocumentDownloadUrlAction,
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
        Öppna en mapp för att se filer och ladda upp – eller släpp en fil direkt
        på mappen.
      </p>

      {activeFolder ? (
        <FolderView
          propertyId={propertyId}
          folder={activeFolder}
          documents={docsInFolder(documents, activeFolder)}
          canEdit={canEdit}
          canDelete={canDelete}
          onBack={() => setActiveFolder(null)}
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
  onOpen,
}: {
  propertyId: string;
  type: DocumentType;
  count: number;
  canEdit: boolean;
  onOpen: () => void;
}) {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragDepth = useRef(0);

  async function uploadFile(file: File) {
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
        type,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Något gick fel vid uppladdning.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <li>
      <button
        type="button"
        className={`profile-doc-folder-card${dragOver ? " is-dragover" : ""}${uploading ? " is-uploading" : ""}`}
        onClick={onOpen}
        onDragEnter={
          canEdit
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragDepth.current += 1;
                setDragOver(true);
              }
            : undefined
        }
        onDragLeave={
          canEdit
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragDepth.current -= 1;
                if (dragDepth.current <= 0) {
                  dragDepth.current = 0;
                  setDragOver(false);
                }
              }
            : undefined
        }
        onDragOver={
          canEdit
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
              }
            : undefined
        }
        onDrop={
          canEdit
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragDepth.current = 0;
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void uploadFile(file);
              }
            : undefined
        }
        disabled={uploading}
      >
        <span className="profile-doc-folder-card-main">
          <span className="profile-doc-folder-name">
            {DOCUMENT_TYPE_LABELS[type]}
          </span>
          <span className="profile-doc-folder-count">
            {uploading
              ? "Laddar upp…"
              : dragOver
                ? "Släpp för att ladda upp"
                : `${count} ${count === 1 ? "fil" : "filer"}`}
          </span>
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
}: {
  propertyId: string;
  folder: DocumentType;
  documents: DashboardDocument[];
  canEdit: boolean;
  canDelete: boolean;
  onBack: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [note, setNote] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

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
            />
          ))}
        </ul>
      ) : (
        <p className="profile-dashboard-text">Inga filer i den här mappen ännu.</p>
      )}

      {canEdit ? (
        <div
          className={`profile-doc-dropzone${dragOver ? " is-dragover" : ""}`}
          onDragEnter={(e) => {
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
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
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
}: {
  propertyId: string;
  doc: DashboardDocument;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [dlError, setDlError] = useState<string | null>(null);
  const [dlPending, setDlPending] = useState(false);
  const [delState, delAction, delPending] = useActionState(
    deleteDocumentAction,
    actionInitial,
  );

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

  return (
    <li className="profile-doc-item">
      <div className="profile-doc-item-main">
        <p className="profile-doc-title">
          {displayNameFromFilePath(doc.file_path)}
        </p>
        <p className="profile-doc-meta">
          {new Date(doc.uploaded_at).toLocaleDateString("sv-SE")}
          {doc.note ? ` · ${doc.note}` : null}
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
              disabled={delPending}
            >
              Ta bort
            </button>
          </form>
        ) : null}
      </div>
      {dlError || delState.error ? (
        <p className="profile-ownership-error" role="alert">
          {dlError || delState.error}
        </p>
      ) : null}
    </li>
  );
}
