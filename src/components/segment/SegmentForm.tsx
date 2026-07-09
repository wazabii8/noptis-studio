import { saveGidSegment, getGidSegment } from "@/lib/localDb.ts";
import { useEffect, useState } from "react";
import {useTranslation} from "@/i18n/useTranslation.ts";

type SegmentFormProps = {
  title: string;
  segmentKey: string;
  segmentValue: string;
  onSaved?: (segmentKey: string, value: string) => void;
};

function SegmentForm({ title, segmentKey, segmentValue, onSaved }: SegmentFormProps) {
  const {t} = useTranslation();
  const [value, setValue] = useState("");
  const IS_GID = segmentKey.indexOf("GID_") !== -1;
  const MAX_LENGTH = (IS_GID) ? 160 : 60;

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

      {IS_GID && (
        <textarea
          key={segmentKey}
          className="border p-2 min-h-19"
          name={segmentKey}
          placeholder={t("gidPlaceholder")}
          value={value}
          maxLength={MAX_LENGTH}
          onChange={(e) => setValue(e.target.value)}
        />
      )}

      {!IS_GID && (
        <input
          key={segmentKey}
          type="text"
          className="border p-2"
          name={segmentKey}
          placeholder={t("segmentPlaceholder")}
          value={value}
          maxLength={MAX_LENGTH}
          onChange={(e) => setValue(e.target.value)}
        />
      )}

      <div
        className={`text-sm text-right ${
          value.length >= MAX_LENGTH
            ? "text-red-600"
            : value.length >= MAX_LENGTH * 0.9
              ? "text-amber-600"
              : "text-gray-500"
        }`}
      >
        {value.length} / {MAX_LENGTH}
      </div>

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

export default SegmentForm;