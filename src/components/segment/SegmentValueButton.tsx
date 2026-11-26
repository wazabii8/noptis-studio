type SegmentValueButtonProps = {
  value: string;
  valid: boolean;
  savedValue?: string;
  onEdit?: () => void;
};

function SegmentValueButton({value, valid, savedValue, onEdit}: SegmentValueButtonProps) {
  if (!valid) return <span className="color-noptis">{value}</span>;
  if (!onEdit) return <span>{value}</span>;

  return (
    <button type="button" className="text-sky-600 flex flex-wrap gap-x-1 items-center" onClick={onEdit}>
      <span>{value}</span>
      {savedValue && <span className="text-sm whitespace-pre-line wrap-anywhere">({savedValue})</span>}
    </button>
  );
}

export default SegmentValueButton;
