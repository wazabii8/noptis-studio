import Modal from "@/components/ui/Modal";
import Article from "@/components/ui/Article";
import SegmentForm from "./SegmentForm";
import {type ReactNode, useEffect, useState} from "react";
import {useDbVersion} from "@/lib/dbChanges";
import {getAllGidSegments, saveGidSegment, type GidSegmentValue} from "@/lib/localDb";
import {getSegmentColor, isSavedNumberKind, type SavedNumberKind} from "@/segments/Segments";
import {type Segment} from "@/utils/Helpers";
import {useTranslation} from "@/i18n/useTranslation";
import {InfoIcon, PencilIcon, PlusIcon} from "@/components/ui/Icons";

type SegmentTableProps = {
  gid: string;
  gidValid: boolean;
  segments: Segment[];
  typeLabel: string;
  prefix: string;
};

/** The inspector's result card: one row per segment plus the GID description. */
function SegmentTable({gid, gidValid, segments, typeLabel, prefix}: SegmentTableProps) {
  const {t} = useTranslation();
  const [modal, setModal] = useState<{title: string; content: ReactNode} | null>(null);
  const dbVersion = useDbVersion();
  const [savedValues, setSavedValues] = useState<Record<string, GidSegmentValue> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const closeModal = () => setModal(null);
  const gidDescription = savedValues?.[`GID_${gid}`];

  useEffect(() => {
    let active = true;
    getAllGidSegments().then(records => {
      if (active) setSavedValues(Object.fromEntries(records.map(record => [record.key, record])));
    }).catch(() => {
      if (active) setLoadFailed(true);
    });
    return () => { active = false; };
  }, [dbVersion]);

  function openEditor(kind: SavedNumberKind, number: string, savedValue?: GidSegmentValue) {
    setModal({
      title: t("GIDSegmentDetails"),
      content: (
        <SegmentForm
          kind={kind}
          number={number}
          initialText={savedValue?.value}
          onCancel={closeModal}
          onSave={async (number, value) => {
            const key = `${kind}_${number}`;
            const record = await saveGidSegment(key, value, savedValue?.revision ?? null);
            setSavedValues(current => ({...current, [key]: record}));
            closeModal();
          }}
        />
      ),
    });
  }

  /** The right-hand column of a row: the type name, a saved name, or why the segment is invalid. */
  function renderNameCell(segment: Segment) {
    if (!segment.isValid) {
      const message = segment.key === "PADDING"
        ? t("expectedValue").replace("{value}", segment.value)
        : t("expectedDigits").replace("{count}", String(segment.value.length));
      return <span className="segment-row-error">{message}</span>;
    }

    if (segment.key === "PREFIX") return <span className="segment-row-muted">{typeLabel}</span>;
    if (!savedValues || !isSavedNumberKind(segment.key)) return null;

    const kind = segment.key;
    const number = segment.inpValue;
    const savedValue = savedValues[`${kind}_${number}`];

    if (!savedValue?.value) {
      return (
        <button type="button" className="btn btn-add" aria-label={`${t("addNameFor")} ${number}`}
                onClick={() => openEditor(kind, number, savedValue)}>
          <PlusIcon />{t("addName")}
        </button>
      );
    }

    return (
      <>
        <span className="segment-row-name">{savedValue.value}</span>
        <button type="button" className="icon-btn" aria-label={`${t("editNameFor")} ${number}`} title={t("editName")}
                onClick={() => openEditor(kind, number, savedValue)}>
          <PencilIcon />
        </button>
      </>
    );
  }

  return (
    <section className="studio-card" aria-labelledby="gid-type-heading">
      <Modal title={modal?.title ?? ""} content={modal?.content} open={modal !== null} onClose={closeModal} />
      <div className="studio-card-header">
        <div className="studio-card-heading">
          <h2 id="gid-type-heading" className="studio-card-title result-title">{typeLabel}</h2>
          <span className="code-pill">{prefix}</span>
          <span className="studio-card-meta">
            {t("segmentCountHint").replace("{count}", String(segments.length))}
          </span>
        </div>
      </div>
      {loadFailed && <p className="studio-card-empty" role="alert">{t("loadFailed")}</p>}

      <ul>
        {segments.map((segment, index) => (
          <li key={`${segment.key}-${index}`} className={segment.isValid ? "segment-row" : "segment-row is-invalid"}>
            <button type="button" className="segment-label-button" onClick={() => setModal({
              title: t("GIDSegmentDetails"),
              content: <Article title={segment.label} description={segment.description} dangerously={true} />,
            })}>
              <span className="segment-dot" style={{backgroundColor: getSegmentColor(segment.key)}} aria-hidden="true" />
              {segment.label}
              <InfoIcon className="segment-label-info" />
            </button>
            <span className="segment-value">{segment.inpValue || "—"}</span>
            <span className="segment-row-end">{renderNameCell(segment)}</span>
          </li>
        ))}
      </ul>

      <div className="inspector-footer">
        <div className="inspector-footer-text">
          <p className="inspector-footer-label">{t("gidDescription")}</p>
          {gidValid && gidDescription?.value ? (
            <p className="inspector-footer-value">{gidDescription.value}</p>
          ) : (
            <p className="inspector-footer-value is-muted">
              {t(gidValid ? "noDescriptionYet" : "completeGidToDescribe")}
            </p>
          )}
        </div>
        {gidValid && gidDescription?.value ? (
          <button type="button" className="btn btn-secondary" onClick={() => openEditor("GID", gid, gidDescription)}>
            <PencilIcon />{t("editDescription")}
          </button>
        ) : (
          <button type="button" className="btn btn-add" disabled={!gidValid || !savedValues}
                  onClick={() => openEditor("GID", gid, gidDescription)}>
            <PlusIcon />{t("addDescription")}
          </button>
        )}
      </div>
    </section>
  );
}

export default SegmentTable;
