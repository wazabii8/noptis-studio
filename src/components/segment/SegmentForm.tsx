import {StaleRecordError} from "@/lib/localDb";
import {useId, useState, type ChangeEvent, type FormEvent} from "react";
import {useLocale} from "@/i18n/LocaleContext";
import {useTranslation} from "@/i18n/useTranslation";
import {createSegments, savedNumberLabels, type SavedNumberKind} from "@/segments/Segments";
import {isValidSavedNumber} from "@/utils/Helpers";
import {AlertIcon, TrashIcon} from "@/components/ui/Icons";

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
    <form className="segment-form edit-panel" onSubmit={save}>
      <div className={isGid ? "form-fields" : "form-fields form-fields-split"}>
        {editNumber ? (
          <div className="form-field">
            <label htmlFor={numberId}>{numberLabel}</label>
            <input
              id={numberId}
              className="number-input"
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
          <p><strong>{numberLabel}</strong> <span className="number-input">{number}</span></p>
        )}

        <div className="form-field">
          <label htmlFor={textId}>{t(isGid ? "description" : "organizationName")}</label>
          {isGid ? <textarea {...textInput} rows={2} /> : <input {...textInput} type="text" />}
          <p className="form-hint">{value.length} / {maxLength}</p>
        </div>
      </div>

      {errorMessage && (
        <p id={`${numberId}-error`} className="form-error" role="alert"><AlertIcon />{errorMessage}</p>
      )}
      {confirmingDelete ? (
        <div className="confirm-box">
          <div className="confirm-box-text">
            <p className="confirm-box-title">{t("confirmDeleteSavedNumber").replace("{number}", number)}</p>
            <p className="confirm-box-hint">{t("confirmDeleteSavedNumberHint")}</p>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" disabled={busy} autoFocus onClick={() => {
              setConfirmingDelete(false);
              setError(null);
            }}>{t("cancel")}</button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={remove}>{t("delete")}</button>
          </div>
        </div>
      ) : (
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>{t("save")}</button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>{t("cancel")}</button>
          {onDelete && (
            <button type="button" className="btn btn-ghost form-actions-end" disabled={busy} onClick={() => {
              setConfirmingDelete(true);
              setError(null);
            }}><TrashIcon />{t("delete")}</button>
          )}
        </div>
      )}
    </form>
  );
}

export default SegmentForm;
