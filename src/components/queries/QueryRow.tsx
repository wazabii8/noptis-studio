import {useEffect, useRef, useState} from "react";
import {StaleRecordError} from "@/lib/localDb";
import {useTranslation} from "@/i18n/useTranslation";
import {deleteQuery, editQuery, type QueryFields, type SavedQuery} from "@/lib/queries";
import QueryForm from "./QueryForm";
import {CheckIcon, ChevronRightIcon, CopyIcon, PencilIcon, TrashIcon} from "@/components/ui/Icons";

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
    <li className="query-item">
      <div className="query-item-head">
        <button type="button" className="query-toggle" aria-expanded={expanded} aria-controls={'query-' + query.id}
                onClick={() => setExpanded(!expanded)}>
          <ChevronRightIcon className="query-chevron" />
          <span className="min-w-0">
            <span className="query-item-title">{query.title}</span>
            {query.description && <span className="query-item-description">{query.description}</span>}
          </span>
        </button>
        <button type="button" className={copied ? "btn btn-done" : "btn btn-secondary"} onClick={copySql} aria-live="polite">
          {copied ? <CheckIcon /> : <CopyIcon />}{t(copied ? "copied" : "copySql")}
        </button>
      </div>
      <div id={'query-' + query.id} className="query-item-body" hidden={!expanded}>
        {error && <p className="form-error" role="alert">{t(error)}</p>}
        {draft ? (
          <QueryForm kind="query" initial={draft} onSave={save} onCancel={() => { setDraft(undefined); onDraft(false); }} />
        ) : (
          <>
            <pre><code>{query.sql}</code></pre>
            {deleting ? (
              <div className="confirm-box">
                <p className="confirm-box-text confirm-box-title">{t("confirmDeleteQuery")}</p>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" autoFocus
                          onClick={() => { setDeleting(undefined); setError(null); onDraft(false); }}>{t("cancel")}</button>
                  <button type="button" className="btn btn-danger" onClick={remove}>{t("delete")}</button>
                </div>
              </div>
            ) : (
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setDraft(query); onDraft(true); }}>
                  <PencilIcon />{t("edit")}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setDeleting(query); onDraft(true); }}>
                  <TrashIcon />{t("delete")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}
