import {useId, useState, type FormEvent} from "react";
import {StaleRecordError} from "@/lib/localDb";
import {useTranslation} from "@/i18n/useTranslation";
import {isBuiltInListTitle, type ListFields, type QueryFields} from "@/lib/queries";
import {AlertIcon, TrashIcon} from "@/components/ui/Icons";

type Props = {
  kind: "list" | "query";
  initial?: ListFields & {sql?: string};
  onSave: (fields: QueryFields) => Promise<void>;
  onCancel: () => void;
  onRequestDelete?: () => void;
};

export default function QueryForm({kind, initial, onSave, onCancel, onRequestDelete}: Props) {
  const {t} = useTranslation();
  const id = useId();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sql, setSql] = useState(initial?.sql ?? "");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<"staleRecord" | "saveFailed">();
  const reservedTitle = kind === "list" && isBuiltInListTitle(title);
  const valid = title.trim() && !reservedTitle && (kind === "list" || sql.trim());
  const heading = kind === "list"
    ? (initial ? "manageList" : "newList")
    : (initial ? "editQuery" : "addQuery");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setFailure(undefined);
    try {
      await onSave({title: title.trim(), description: description.trim(), sql});
    } catch (error) {
      setFailure(error instanceof StaleRecordError ? "staleRecord" : "saveFailed");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset className="query-form" disabled={saving}>
        <legend>{t(heading)}</legend>
        <div className="form-field">
          <label htmlFor={id + "-title"}>{t("fieldTitle")}</label>
          <input id={id + "-title"} autoFocus required value={title}
                 aria-invalid={reservedTitle || undefined} aria-describedby={reservedTitle ? id + "-title-error" : undefined}
                 onChange={e => setTitle(e.target.value)} />
          {reservedTitle && <p id={id + "-title-error"} className="form-error"><AlertIcon />{t("builtInListTitle")}</p>}
        </div>
        <div className="form-field">
          <label htmlFor={id + "-description"}>{t("description")}</label>
          <textarea id={id + "-description"} rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        {kind === "query" && (
          <div className="form-field">
            <label htmlFor={id + "-sql"}>SQL</label>
            <textarea id={id + "-sql"} className="sql-input" required rows={7} wrap="off" spellCheck={false}
                      value={sql} onChange={e => setSql(e.target.value)} />
          </div>
        )}
        {failure && <p className="form-error" role="alert"><AlertIcon />{t(failure)}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            {t(kind === "list" && initial ? "saveChanges" : "save")}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>{t("cancel")}</button>
          {onRequestDelete && (
            <button type="button" className="btn btn-ghost form-actions-end" onClick={onRequestDelete}>
              <TrashIcon />{t("deleteList")}
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}
