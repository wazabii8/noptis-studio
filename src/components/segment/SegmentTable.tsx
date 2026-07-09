import Modal from "@/components/ui/Modal.tsx";
import Article from "@/components/ui/Article.tsx";
import SegmentForm from "@/components/segment/SegmentForm.tsx";
import SegmentValueButton from "@/components/segment/SegmentValueButton.tsx";
import {type ReactNode, useState} from "react";
import {getGIDFromSegmentObj} from "@/utils/Helpers.ts";
import {useTranslation} from "@/i18n/useTranslation.ts";

type Segment = {
  key: string;
  label: string;
  description: string;
  value: string;
  inpValue: string;
  isValid: boolean;
  isPadding: boolean;
};

type SegmentTableProps = {
  title: string;
  segments: Segment[];
};

function SegmentTable({title, segments}: SegmentTableProps) {
  const {t} = useTranslation();
  const [show, setShow] = useState(false);
  const [modalContent, setModalContent] = useState<ReactNode>(null);
  const [savedValues, setSavedValues] = useState<Record<string, string>>({});
  const GID = getGIDFromSegmentObj(segments);
  const GIDName = `GID_${GID}`;

  const openModal = (segment: Segment) => {
    setShow(true);
    setModalContent(
      <Article
        title={segment.label}
        description={segment.description}
        dangerously={true}
      />
    );
  };

  const closeModal = () => {
    setShow(false);
  };

  const openFormModal = (
    title: string,
    segmentName: string,
    value: string
  ) => {
    setShow(true);
    setModalContent(
      <SegmentForm
        title={title}
        segmentKey={segmentName}
        segmentValue={value}
        onSaved={(key, savedValue) => {
          setShow(false);
          setSavedValues((current) => ({
            ...current,
            [key]: savedValue,
          }));
        }}
      />
    );
  };

  return (
    <div>
      <Modal
        title={title}
        content={modalContent}
        open={show}
        onClose={closeModal}
      />

      <table>
        <tbody>
        {segments.map((segment, index) => {
          const segmentName = `${segment.key}_${segment.inpValue}`;

          return (
            <tr key={`${segment.key}-${index}`}>
              <th>
                <button onClick={() => openModal(segment)}>
                  {segment.label}
                </button>
              </th>

              <td
                className={segment.isValid ? "valid" : "error"}
                title={
                  segment.isValid
                    ? segment.value
                    : `${segment.inpValue}->${segment.value}`
                }
              >
                <SegmentValueButton
                  title={segment.label}
                  valid={segment.isValid}
                  value={segment.inpValue}
                  segmentKey={segment.key}
                  savedValue={savedValues[segmentName]}
                  onOpen={openFormModal}
                />
              </td>
            </tr>
          );
        })}
        </tbody>
      </table>

      {GID && (
        <div className={"mt-5 text-xl flex gap-2"}>
          <strong className={"min-w-31"}>{t("GIDNumber")}:</strong>
          <SegmentValueButton
            title={"GID"}
            valid={GID.length === 16}
            value={GID}
            segmentKey={"GID"}
            savedValue={savedValues[GIDName]}
            onOpen={openFormModal}
          />
        </div>
      )}

    </div>
  );
}

export default SegmentTable;