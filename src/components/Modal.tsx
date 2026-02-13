import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
}

function Modal({open, onClose, children}: ModalProps) {

  if (!open) {
    return null;
  }

  return (
    <div className={"fixed w-full h-full left-0 top-0"}>
      <button onClick={onClose}></button>
      <div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
