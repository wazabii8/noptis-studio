import Modal from "@/components/Modal.tsx";
import Text from "@/components/Text.tsx";
import Form from "@/components/Form.tsx";
import {type ReactNode, useEffect, useState} from "react";
import {getGidSegment, type GidSegmentValue} from "@/lib/localDb";
import {getGIDFromSegmentObj} from "@/utils/Helpers.ts";
import {useTranslation} from "@/i18n/useTranslation";


type Segment = {
  key: string;
  label: string;
  description: string;
  value: string;
  inpValue: string;
  isValid: boolean;
  isPadding: boolean;
};

type TableProps = {
  title: string;
  segments: Segment[];
};

type ModalFormButtonProps = {
  title: string;
  value: string;
  valid: boolean;
  segmentKey: string;
  savedValue?: string;
  onOpen: (title: string, segmentName: string, value: string) => void;
};

function OpenFormModalButton({
                               title,
                               value,
                               valid,
                               segmentKey,
                               savedValue,
                               onOpen,
                             }: ModalFormButtonProps) {
  const [savedSegment, setSavedSegment] = useState<GidSegmentValue | undefined>();

  const segmentName = `${segmentKey}_${value}`;

  useEffect(() => {
    if (segmentKey !== "THM" && segmentKey !== "CONTRACTOR" && segmentKey !== "GID") {
      return;
    }

    if (!valid) {
      return;
    }

    async function loadSavedSegment() {
      const result = await getGidSegment(segmentName);
      setSavedSegment(result);
    }

    void loadSavedSegment();
  }, [valid, segmentName, segmentKey]);

  if (!valid) {
    return <span className="color-noptis">{value}</span>;
  }

  if (segmentKey !== "THM" && segmentKey !== "CONTRACTOR" && segmentKey !== "GID") {
    return <span>{value}</span>;
  }

  const displayValue = savedValue ?? savedSegment?.value;

  return (
    <button className={"text-sky-600"} onClick={() => onOpen(title, segmentName, value)}>
      <span>{value}</span>
      <span className={"text-sm"}>{displayValue ? ` (${displayValue})` : ""}</span>
    </button>
  );
}

function Table({title, segments}: TableProps) {
  const {t} = useTranslation();
  const [show, setShow] = useState(false);
  const [modalContent, setModalContent] = useState<ReactNode>(null);
  const [savedValues, setSavedValues] = useState<Record<string, string>>({});
  const GID = getGIDFromSegmentObj(segments);
  const GIDName = `GID_${GID}`;

  const openModal = (segment: Segment) => {
    setShow(true);
    setModalContent(
      <Text
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
      <Form
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
                <OpenFormModalButton
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
          <strong>{t("GIDNumber")}:</strong>
          <OpenFormModalButton
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

export default Table;