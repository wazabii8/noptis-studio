import {useState} from "react";
import {StaleRecordError} from "@/lib/localDb";
import {useTranslation} from "@/i18n/useTranslation";
import {countListQueries, type ListFields, type QueryList} from "@/lib/queries";
import QueryForm from "./QueryForm";

type Props = {
  list: QueryList;
  onSave: (fields: ListFields) => Promise<void>;
  onCancel: () => void;
  onDelete: (count: number | undefined) => Promise<void>;
  busy: boolean;
};

export default function ManageListForm({list, onSave, onCancel, onDelete, busy}: Props) {
  const {t} = useTranslation();
  const [count, setCount] = useState<number>();
  const [counting, setCounting] = useState(false);
  const [error, setError] = useState<"loadFailed" | "deleteListFailed" | "staleRecord">();

  async function requestDelete() {
    setCounting(true);
    setError(undefined);
    try {
      setCount(await countListQueries(list.id));
    } catch {
      setError("loadFailed");
    } finally {
      setCounting(false);
    }
  }

  async function confirmDelete() {
    setError(undefined);
    try {
      await onDelete(count);
    } catch (error) {
      setError(error instanceof StaleRecordError ? "staleRecord" : "deleteListFailed");
    }
  }

  const confirmation = count === 0 ? "confirmDeleteEmptyList"
    : count === 1 ? "confirmDeleteSingleQueryList" : "confirmDeleteList";

  return (
    <>
      <fieldset className="min-w-0" disabled={counting} hidden={count !== undefined}>
        <QueryForm kind="list" initial={list} onSave={onSave} onCancel={onCancel} onRequestDelete={requestDelete} />
      </fieldset>
      {count !== undefined && (
        <section aria-labelledby="delete-list-prompt">
          <p id="delete-list-prompt" className="query-description mb-2">
            {t(confirmation).replace("{count}", String(count)).replace("{title}", () => list.title)}
          </p>
          <div className="query-actions">
            <button className="query-primary" disabled={busy} onClick={confirmDelete}>{t("deleteList")}</button>
            <button className="query-secondary" disabled={busy} autoFocus onClick={() => {
              setCount(undefined);
              setError(undefined);
            }}>{t("cancel")}</button>
          </div>
        </section>
      )}
      {error && <p role="alert">{t(error)}</p>}
    </>
  );
}
