import {useId, useState, type FormEvent} from "react";
import {useTranslation} from "@/i18n/useTranslation";
import type {QueryFields} from "@/lib/queries";

type Props = {
  kind: "list" | "query";
  initial?: QueryFields;
  onSave: (fields: QueryFields) => Promise<void>;
  onCancel: () => void;
};

export default function QueryForm({kind, initial, onSave, onCancel}: Props) {
  const {t} = useTranslation();
  const id = useId();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sql, setSql] = useState(initial?.sql ?? "");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const valid = title.trim() && (kind === "list" || sql.trim());

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await onSave({title: title.trim(), description: description.trim(), sql});
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset className="query-form" disabled={saving}>
        <legend className="headline-4">{t(kind === "list" ? "newList" : initial ? "editQuery" : "addQuery")}</legend>
        <label htmlFor={id + "-title"}>{t("fieldTitle")}</label>
        <input id={id + "-title"} autoFocus required value={title} onChange={e => setTitle(e.target.value)} />
        <label htmlFor={id + "-description"}>{t("description")}</label>
        <textarea id={id + "-description"} rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        {kind === "query" && (
          <>
            <label htmlFor={id + "-sql"}>SQL</label>
            <textarea id={id + "-sql"} className="sql-input" required rows={7} wrap="off" spellCheck={false}
                      value={sql} onChange={e => setSql(e.target.value)} />
          </>
        )}
        {failed && <p role="alert">{t("saveFailed")}</p>}
        <div className="query-actions">
          <button type="submit" className="query-primary" disabled={!valid}>{t("save")}</button>
          <button type="button" className="query-secondary" onClick={onCancel}>{t("cancel")}</button>
        </div>
      </fieldset>
    </form>
  );
}
