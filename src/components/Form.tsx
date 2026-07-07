import { saveGidSegment, getGidSegment } from "@/lib/localDb";
import { useEffect, useState } from "react";
import {useTranslation} from "@/i18n/useTranslation";

type FormProps = {
  title: string;
  segmentKey: string;
  segmentValue: string;
  onSaved?: (segmentKey: string, value: string) => void;
};

function Form({ title, segmentKey, segmentValue, onSaved }: FormProps) {
  const {t} = useTranslation();
  const [value, setValue] = useState("");

  useEffect(() => {
    async function loadSegment() {
      const savedSegment = await getGidSegment(segmentKey);
      setValue(savedSegment?.value ?? "");
    }

    void loadSegment();
  }, [segmentKey]);

  return (
    <div>

      <h2 className={"headline-3 mb-5"}>{title}</h2>
      <p>{t("segmentValue")}: <strong>{segmentValue}</strong></p>

      <input
        type="text"
        className={"border p-2"}
        name={segmentKey}
        placeholder={t("segmentPlaceholder")}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <button
        className={"button-primary"}
        onClick={async () => {
          await saveGidSegment(segmentKey, value);
          onSaved?.(segmentKey, value);
        }}
      >
        {t("save")}
      </button>
    </div>
  );
}

export default Form;