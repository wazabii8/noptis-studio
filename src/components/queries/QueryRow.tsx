import {useEffect, useRef, useState} from "react";
import {StaleRecordError} from "@/lib/localDb";
import {useTranslation} from "@/i18n/useTranslation";
import {deleteQuery, editQuery, type QueryFields, type SavedQuery} from "@/lib/queries";
import QueryForm from "./QueryForm";

type Props = {
  query: SavedQuery;
  onEdit: (updated: SavedQuery) => void;
  onDelete: () => void;
  onDraft: (active: boolean) => void;
};

export default function QueryRow({query, onEdit, onDelete, onDraft}: Props) {
  const {t} = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<SavedQuery>();
  const [deleting, setDeleting] = useState<SavedQuery>();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<"copyFailed" | "deleteFailed" | "staleRecord" | null>(null);
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
      setError("copyFailed");
      setExpanded(true);
    }
  }

  async function save(fields: QueryFields) {
    if (!draft) return;
    const updated = await editQuery({...draft, ...fields});
    setDraft(undefined);
    onDraft(false);
    onEdit(updated);
  }

  async function remove() {
    try {
      if (!deleting) return;
      await deleteQuery(deleting.id, deleting.revision);
      onDraft(false);
      onDelete();
    } catch (error) {
      setError(error instanceof StaleRecordError ? "staleRecord" : "deleteFailed");
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
        {draft ? (
          <QueryForm kind="query" initial={draft} onSave={save} onCancel={() => { setDraft(undefined); onDraft(false); }} />
        ) : (
          <>
            <pre><code>{query.sql}</code></pre>
            {deleting ? (
              <>
                <p className="mb-2">{t("confirmDeleteQuery")}</p>
                <div className="query-actions">
                  <button className="query-primary" onClick={remove}>{t("delete")}</button>
                  <button className="query-secondary" onClick={() => { setDeleting(undefined); setError(null); onDraft(false); }}>{t("cancel")}</button>
                </div>
              </>
            ) : (
              <div className="query-actions">
                <button className="query-secondary" onClick={() => { setDraft(query); onDraft(true); }}>{t("edit")}</button>
                <button className="query-secondary" onClick={() => { setDeleting(query); onDraft(true); }}>{t("delete")}</button>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}
