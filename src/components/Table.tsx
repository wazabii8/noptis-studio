import Modal from "@/components/Modal.tsx";
import Text from "@/components/Text.tsx";
import Form from "@/components/Form.tsx";
import {type ReactNode, useEffect, useState} from "react";
import {getGidSegment, type GidSegmentValue} from "@/lib/localDb";

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
  onOpen: (title: string, segmentName: string, value: string) => void;
};

function OpenFormModalButton({
                               title,
                               value,
                               valid,
                               segmentKey,
                               onOpen,
                             }: ModalFormButtonProps) {
  const [savedSegment, setSavedSegment] = useState<GidSegmentValue | undefined>(
    undefined
  );

  const segmentName = `${segmentKey}_${value}`;

  useEffect(() => {
    if (!valid) {
      return;
    }

    async function loadSavedSegment() {
      const result = await getGidSegment(segmentName);
      setSavedSegment(result);
    }

    void loadSavedSegment();
  }, [valid, segmentName]);

  if (!valid) {
    return <span className="color-noptis">{value}</span>;
  }

  return (
    <button onClick={() => onOpen(title, segmentName, value)}>
      {value}
      {savedSegment?.value ? ` (${savedSegment.value})` : ""}
    </button>
  );
}

function Table({title, segments}: TableProps) {
  const [show, setShow] = useState(false);
  const [modalContent, setModalContent] = useState<ReactNode>(null);

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
      <Form title={title} segmentKey={segmentName} segmentValue={value}/>
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
        {segments.map((segment, index) => (
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
                onOpen={openFormModal}
              />
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;