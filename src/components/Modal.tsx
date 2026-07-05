import { type ReactNode } from "react";

type ModalProps = {
  title: string;
  content: ReactNode;
  open: boolean;
  onClose: () => void;
};

function Modal({ title, content, open, onClose }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-8 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              {title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-content overflow-y-auto px-8 py-7">
            {content}
        </div>
      </div>
    </div>
  );
}

export default Modal;