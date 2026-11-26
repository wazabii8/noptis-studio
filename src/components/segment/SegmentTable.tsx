import Modal from "@/components/ui/Modal";
import Article from "@/components/ui/Article";
import SegmentForm from "./SegmentForm";
import SegmentValueButton from "./SegmentValueButton";
import {type ReactNode, useEffect, useState} from "react";
import {useDbVersion} from "@/lib/dbChanges";
import {getAllGidSegments, saveGidSegment, type GidSegmentValue} from "@/lib/localDb";
import {isSavedNumberKind, type SavedNumberKind} from "@/segments/Segments";
import {type Segment} from "@/utils/Helpers";
import {useTranslation} from "@/i18n/useTranslation";

type SegmentTableProps = {
  gid: string;
  gidValid: boolean;
  segments: Segment[];
};

function SegmentTable({gid, gidValid, segments}: SegmentTableProps) {
  const {t} = useTranslation();
  const [modalContent, setModalContent] = useState<ReactNode>(null);
  const dbVersion = useDbVersion();
  const [savedValues, setSavedValues] = useState<Record<string, GidSegmentValue> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const closeModal = () => setModalContent(null);

  useEffect(() => {
    let active = true;
    getAllGidSegments().then(records => {
      if (active) setSavedValues(Object.fromEntries(records.map(record => [record.key, record])));
    }).catch(() => {
      if (active) setLoadFailed(true);
    });
    return () => { active = false; };
  }, [dbVersion]);

  function renderEditableValue(kind: string, number: string, valid: boolean) {
    if (!valid || !savedValues || !isSavedNumberKind(kind)) {
      return <SegmentValueButton value={number} valid={valid} />;
    }

    const key = `${kind}_${number}`;
    const savedValue = savedValues[key];
    return (
      <SegmentValueButton value={number} valid={valid} savedValue={savedValue?.value}
                          onEdit={() => openEditor(kind, number, savedValue)} />
    );
  }

  function openEditor(kind: SavedNumberKind, number: string, savedValue?: GidSegmentValue) {
    setModalContent(
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
    );
  }

  return (
    <div>
      <Modal title={t("GIDSegmentDetails")} content={modalContent} open={modalContent !== null} onClose={closeModal} />
      {loadFailed && <p role="alert">{t("loadFailed")}</p>}
      <table>
        <tbody>
        {segments.map((segment, index) => (
          <tr key={`${segment.key}-${index}`}>
            <th scope="row">
              <button type="button" onClick={() => setModalContent(
                <Article title={segment.label} description={segment.description} dangerously={true} />
              )}>
                {segment.label}
              </button>
            </th>
            <td className={segment.isValid ? "valid" : "error"}
                title={segment.isValid ? segment.value : `${segment.inpValue}->${segment.value}`}>
              {renderEditableValue(segment.key, segment.inpValue, segment.isValid)}
            </td>
          </tr>
        ))}
        </tbody>
      </table>
      <div className="mt-5 text-xl flex flex-wrap gap-2">
        <strong className="min-w-31">{t("GIDNumber")}:</strong>
        {renderEditableValue("GID", gid, gidValid)}
      </div>
    </div>
  );
}

export default SegmentTable;
