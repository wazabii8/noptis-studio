import {useEffect, useRef, useState} from "react";
import {useTranslation} from "@/i18n/useTranslation";
import {deleteQuery, editQuery, type QueryFields, type SavedQuery} from "@/lib/queries";
import QueryForm from "./QueryForm";

type Props = {
  query: SavedQuery;
  onEdit: (updated: SavedQuery) => void;
  onDelete: () => void;
};

export default function QueryRow({query, onEdit, onDelete}: Props) {
  const {t} = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<"copyFailed" | "deleteFailed" | null>(null);
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copySql() {
    setError(null);
    try {
      await navigator.clipboard.writeText(query.sql);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setEditing(false);
      setError("copyFailed");
      setExpanded(true);
    }
  }

  async function save(fields: QueryFields) {
    const updated = {...query, ...fields};
    await editQuery(updated);
    onEdit(updated);
    setEditing(false);
  }

  async function remove() {
    try {
      await deleteQuery(query.id);
      onDelete();
    } catch {
      setError("deleteFailed");
    }
  }

  return (
    <li className="query-row">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button className="query-title" aria-expanded={expanded} aria-controls={'query-' + query.id}
                  onClick={() => setExpanded(!expanded)}>
            <span aria-hidden="true" className="query-chevron" />{query.title}
          </button>
          {query.description && <p className="query-description">{query.description}</p>}
        </div>
        <button className="query-copy query-secondary" onClick={copySql} aria-live="polite">
          {t(copied ? "copied" : "copySql")}
        </button>
      </div>
      {error && <p role="alert">{t(error)}</p>}
      <div id={'query-' + query.id} hidden={!expanded}>
        {editing ? (
          <QueryForm kind="query" initial={query} onSave={save} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <pre><code>{query.sql}</code></pre>
            {confirmingDelete ? (
              <>
                <p className="mb-2">{t("confirmDeleteQuery")}</p>
                <div className="query-actions">
                  <button className="query-primary" onClick={remove}>{t("delete")}</button>
                  <button className="query-secondary" onClick={() => setConfirmingDelete(false)}>{t("cancel")}</button>
                </div>
              </>
            ) : (
              <div className="query-actions">
                <button className="query-secondary" onClick={() => setEditing(true)}>{t("edit")}</button>
                <button className="query-secondary" onClick={() => setConfirmingDelete(true)}>{t("delete")}</button>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}
