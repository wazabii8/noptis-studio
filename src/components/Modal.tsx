
type Segment = {
  content: string;
};

function Modal({ segments }: { segments: Segment }) {
  return (
    <div>
      {segments.content}
    </div>
  );
}

export default Modal;
