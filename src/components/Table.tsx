import Modal from "@/components/Modal.tsx";
import Text from "@/components/Text.tsx";
import { type ReactNode, useState } from "react";

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

function Table({ title, segments }: TableProps) {
  const [show, setShow] = useState(false);
  const [modalContent, setModalContent] = useState<ReactNode>(null);

  const openModal = (segment: Segment) => {
    setShow(true);
    setModalContent(
      <Text title={segment.label} description={segment.description} />
    );
  }

  const closeModal = () => {
    setShow(false);
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
          <tr key={index}>
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
                  : segment.inpValue + "->" + segment.value
              }
            >
              {segment.inpValue}
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;