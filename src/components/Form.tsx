import { saveGidSegment, getGidSegment } from "@/lib/localDb";
import { useEffect, useState } from "react";

type FormProps = {
  title: string;
  segmentKey: string;
  segmentValue: string;
};

function Form({ title, segmentKey, segmentValue }: FormProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    async function loadSegment() {
      const savedSegment = await getGidSegment(segmentKey);

      if (savedSegment?.value) {
        setValue(savedSegment.value);
        return;
      }

      setValue("");
    }
    void loadSegment();
  }, [segmentKey]);

  return (
    <div>
      <h1 className="headline-2">{title}</h1>

      <p>
        Segment value: <strong>{segmentValue}</strong>
      </p>

      <input
        type="text"
        name={segmentKey}
        placeholder="What is this segment?"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <button
        onClick={async () => {
          await saveGidSegment(segmentKey, value);
        }}
      >
        Save
      </button>
    </div>
  );
}

export default Form;