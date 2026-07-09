import {useEffect, useState} from "react";
import {getGidSegment, type GidSegmentValue} from "@/lib/localDb.ts";


type SegmentValueButtonProps = {
  title: string;
  value: string;
  valid: boolean;
  segmentKey: string;
  savedValue?: string;
  onOpen: (title: string, segmentName: string, value: string) => void;
};

const allowedSegmentKeys = ["THM", "CONTRACTOR", "GID"];

function SegmentValueButton({title, value, valid, segmentKey, savedValue, onOpen}: SegmentValueButtonProps) {

  const [savedSegment, setSavedSegment] = useState<GidSegmentValue | undefined>();
  const segmentName = `${segmentKey}_${value}`;

  useEffect(() => {

    // Validate if the segment is valid and allowed
    if (!valid || !allowedSegmentKeys.includes(segmentKey)) {
      return;
    }

    // Check if the segment is already saved in the database
    async function loadSavedSegment() {
      const result = await getGidSegment(segmentName);
      setSavedSegment(result);
    }

    void loadSavedSegment();
  }, [valid, segmentName, segmentKey]);

  // Validate if the segment is valid and allowed
  if (!valid) {
    return <span className="color-noptis">{value}</span>;
  }

  // Check if the segment is clickable
  if (!allowedSegmentKeys.includes(segmentKey)) {
    return <span>{value}</span>;
  }

  const displayValue = savedValue ?? savedSegment?.value;

  return (
    <button className={"text-sky-600 flex flex-wrap gap-x-1 items-center"} onClick={() => onOpen(title, segmentName, value)}>
      <span className={"inline-block"}>{value}</span>
      <span className={"text-sm inline-block whitespace-pre-line"}>{displayValue ? ` (${displayValue})` : ""}</span>
    </button>
  );
}

export default SegmentValueButton;