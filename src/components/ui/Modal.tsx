import {type ReactNode, useEffect, useId} from "react";
import {XIcon} from "@/components/ui/Icons";

type ModalProps = {
  title: string;
  description?: string;
  content: ReactNode;
  open: boolean;
  onClose: () => void;
  /** Widens the dialog for content such as the GID layouts grid. */
  wide?: boolean;
};

function Modal({title, description, content, open, onClose, wide = false}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal-dialog relative z-10 flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden ${wide ? "max-w-[56.25rem]" : "max-w-3xl"}`}
      >
        <header className="modal-header">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="modal-title">{title}</h2>
            {description && <p className="modal-description">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close modal" title="Close">
            <XIcon />
          </button>
        </header>

        <div className="modal-content overflow-y-auto">
          {content}
        </div>
      </section>
    </div>
  );
}

export default Modal;
