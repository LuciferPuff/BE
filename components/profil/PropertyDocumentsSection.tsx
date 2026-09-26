"use client";

import { useRouter } from "next/navigation";
import { useActionState, useMemo, useRef, useState } from "react";

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
  DOCUMENT_TYPES,
  displayNameFromFilePath,
  documentTypeLabel,
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

function groupByFolder(
  documents: DashboardDocument[],
): { type: DocumentType | string; label: string; docs: DashboardDocument[] }[] {
  const map = new Map<string, DashboardDocument[]>();
  for (const doc of documents) {
    const key = isDocumentType(doc.type) ? doc.type : "ovrigt";
    const list = map.get(key) ?? [];
    list.push(doc);
    map.set(key, list);
  }

  const folders: {
    type: DocumentType | string;
    label: string;
    docs: DashboardDocument[];
  }[] = [];

  for (const type of DOCUMENT_FOLDER_ORDER) {
    const docs = map.get(type) ?? [];
    if (docs.length === 0) continue;
    docs.sort(
      (a, b) =>
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
    );
    folders.push({
      type,
      label: DOCUMENT_TYPE_LABELS[type],
      docs,
    });
    map.delete(type);
  }

  // Okända typer (legacy) sist
  for (const [type, docs] of map) {
    docs.sort(
      (a, b) =>
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
    );
    folders.push({
      type,
      label: documentTypeLabel(type),
      docs,
    });
  }

  return folders;
}

export function PropertyDocumentsSection({
  propertyId,
  documents,
  canEdit,
  canDelete,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFolder, setUploadFolder] = useState<DocumentType>("ovrigt");
  const fileRef = useRef<HTMLInputElement>(null);
  const folders = useMemo(() => groupByFolder(documents), [documents]);

  async function handleUpload(form: HTMLFormElement) {
    setError(null);
    const fd = new FormData(form);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Välj en fil.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("Filen får vara högst 50 MB.");
      return;
    }

    const type = String(fd.get("type") ?? "");
    const noteRaw = String(fd.get("note") ?? "").trim();

    setUploading(true);
    try {
      const prepFd = new FormData();
      prepFd.set("property_id", propertyId);
      prepFd.set("file_name", file.name);
      prepFd.set("file_size", String(file.size));
      prepFd.set("type", type);

      const prep = await prepareDocumentUploadAction({}, prepFd);
      if (prep.error || !prep.signedUrl || !prep.path) {
        setError(prep.error ?? "Kunde inte förbereda uppladdning.");
        return;
      }

      const uploadRes = await fetch(prep.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });
      if (!uploadRes.ok) {
        setError("Uppladdningen misslyckades. Försök igen.");
        return;
      }

      const confirmFd = new FormData();
      confirmFd.set("property_id", propertyId);
      confirmFd.set("file_path", prep.path);
      confirmFd.set("type", type);
      if (noteRaw) confirmFd.set("note", noteRaw);

      const confirmed = await confirmDocumentUploadAction({}, confirmFd);
      if (confirmed.error) {
        setError(confirmed.error);
        return;
      }

      form.reset();
      setUploadFolder("ovrigt");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      setError("Något gick fel vid uppladdning.");
    } finally {
      setUploading(false);
    }
  }

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
        Sortera papper i mappar – kvitton, instruktioner, besiktning och mer.
      </p>

      {folders.length > 0 ? (
        <ul className="profile-doc-folders">
          {folders.map((folder) => (
            <li key={folder.type}>
              <details className="profile-doc-folder" open>
                <summary className="profile-doc-folder-summary">
                  <span className="profile-doc-folder-name">{folder.label}</span>
                  <span className="profile-doc-folder-count">
                    {folder.docs.length}{" "}
                    {folder.docs.length === 1 ? "fil" : "filer"}
                  </span>
                </summary>
                <ul className="profile-doc-list">
                  {folder.docs.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      propertyId={propertyId}
                      doc={doc}
                      canDelete={canDelete}
                    />
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="profile-dashboard-text">Inga dokument uppladdade ännu.</p>
      )}

      {canEdit ? (
        <form
          className="profile-doc-upload"
          onSubmit={(e) => {
            e.preventDefault();
            void handleUpload(e.currentTarget);
          }}
        >
          <label className="profile-part-field">
            <span>Mapp</span>
            <select
              name="type"
              className="analyse-form-input"
              required
              disabled={uploading}
              value={uploadFolder}
              onChange={(e) =>
                setUploadFolder(e.target.value as DocumentType)
              }
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOCUMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="profile-part-field">
            <span>Fil</span>
            <input
              ref={fileRef}
              type="file"
              name="file"
              className="analyse-form-input"
              required
              disabled={uploading}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.xls,.xlsx,application/pdf,image/*"
            />
          </label>
          <label className="profile-part-field">
            <span>Anteckning (valfritt)</span>
            <input
              type="text"
              name="note"
              className="analyse-form-input"
              maxLength={200}
              disabled={uploading}
              placeholder="t.ex. Överlåtelse 2024"
            />
          </label>
          <button
            type="submit"
            className="home-btn home-btn-primary"
            disabled={uploading}
          >
            {uploading ? "Laddar upp…" : "Ladda upp"}
          </button>
          {error ? (
            <p className="profile-ownership-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
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
