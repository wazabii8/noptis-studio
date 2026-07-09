import Modal from "@/components/Modal.tsx";
import Text from "@/components/Text.tsx";
import Form from "@/components/Form.tsx";
import OpenFormModalButton from "@/components/OpenFormModalButton.tsx";
import {type ReactNode, useState} from "react";
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