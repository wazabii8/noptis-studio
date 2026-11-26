import {StaleRecordError} from "@/lib/localDb";
import {useId, useState, type ChangeEvent, type FormEvent} from "react";
import {useLocale} from "@/i18n/LocaleContext";
import {useTranslation} from "@/i18n/useTranslation";
import {createSegments, savedNumberLabels, type SavedNumberKind} from "@/segments/Segments";
import {isValidSavedNumber} from "@/utils/Helpers";

type SegmentFormProps = {
  kind: SavedNumberKind;
  number: string;
  initialText?: string;
  editNumber?: boolean;
  onSave: (number: string, text: string) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
};

function SegmentForm({kind, number, initialText = "", editNumber = false, onSave, onCancel, onDelete}: SegmentFormProps) {
  const {t} = useTranslation();
  const {lang} = useLocale();
  const numberId = useId();
  const textId = useId();
  const [draftNumber, setDraftNumber] = useState(number);
  const [value, setValue] = useState(initialText);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"invalidSavedGid" | "invalidSavedSegment" | "duplicateSavedNumber" |
    "staleRecord" | "saveFailed" | "deleteSavedNumberFailed" | null>(null);
  const isGid = kind === "GID";
  const maxLength = isGid ? 160 : 60;
  const numberLabel = t(savedNumberLabels[kind]);
  const numberError = error === "invalidSavedGid" || error === "invalidSavedSegment" || error === "duplicateSavedNumber";
  const errorMessage = error === "invalidSavedSegment" && kind !== "GID"
    ? t(error).replace("{length}", String(createSegments(lang)[kind].length))
    : error && t(error);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || confirmingDelete) return;

    if (!isValidSavedNumber(lang, kind, draftNumber)) {
      setError(isGid ? "invalidSavedGid" : "invalidSavedSegment");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSave(draftNumber, value);
    } catch (error) {
      if (error instanceof StaleRecordError) {
        setError("staleRecord");
        return;
      }
      setError(error instanceof DOMException && error.name === "ConstraintError" ? "duplicateSavedNumber" : "saveFailed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!onDelete || busy) return;

    setBusy(true);
    setError(null);
    try {
      await onDelete();
    } catch (error) {
      setError(error instanceof StaleRecordError ? "staleRecord" : "deleteSavedNumberFailed");
    } finally {
      setBusy(false);
    }
  }

  const textInput = {
    id: textId,
    value,
    maxLength,
    disabled: busy || confirmingDelete,
    autoFocus: !editNumber,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(event.target.value),
  };

  return (
    <form className="segment-form" onSubmit={save}>
      {editNumber ? (
        <div className="mb-4">
          <label htmlFor={numberId}>{numberLabel}</label>
          <input
            id={numberId}
            type="text"
            inputMode="numeric"
            autoFocus
            value={draftNumber}
            disabled={busy || confirmingDelete}
            aria-invalid={numberError || undefined}
            aria-describedby={numberError ? `${numberId}-error` : undefined}
            onChange={event => {
              setDraftNumber(event.target.value);
              if (numberError) setError(null);
            }}
          />
        </div>
      ) : (
        <p className="mb-4"><strong>{numberLabel}</strong> {number}</p>
      )}

      <label htmlFor={textId}>{t(isGid ? "description" : "organizationName")}</label>
      {isGid ? <textarea {...textInput} rows={3} /> : <input {...textInput} type="text" />}
      <p className="segment-form-length">{value.length} / {maxLength}</p>

      {confirmingDelete && <p className="mb-2">{t("confirmDeleteSavedNumber").replace("{number}", number)}</p>}
      {errorMessage && <p id={`${numberId}-error`} className="mb-2" role="alert">{errorMessage}</p>}
      <div className="query-actions">
        {confirmingDelete ? (
          <>
            <button type="button" className="query-primary" disabled={busy} onClick={remove}>{t("delete")}</button>
            <button type="button" className="query-secondary" disabled={busy} onClick={() => {
              setConfirmingDelete(false);
              setError(null);
            }}>{t("cancel")}</button>
          </>
        ) : (
          <>
            <button type="submit" className="query-primary" disabled={busy}>{t("save")}</button>
            <button type="button" className="query-secondary" disabled={busy} onClick={onCancel}>{t("cancel")}</button>
            {onDelete && <button type="button" className="query-secondary" disabled={busy} onClick={() => {
              setConfirmingDelete(true);
              setError(null);
            }}>{t("delete")}</button>}
          </>
        )}
      </div>
    </form>
  );
}

export default SegmentForm;
