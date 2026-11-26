import {useId, useMemo} from "react";
import {useLocale} from "@/i18n/LocaleContext";
import {useTranslation} from "@/i18n/useTranslation";
import {GID_LENGTH, getSegmentColor} from "@/segments/Segments";
import {parseGid, type Segment} from "@/utils/Helpers";
import {AlertIcon, CheckIcon, GridIcon, XIcon} from "@/components/ui/Icons";
import SegmentTable from "./SegmentTable";
import InspectorStart from "./InspectorStart";

type GidInspectorProps = {
  value: string;
  onChange: (value: string) => void;
  onOpenLayouts: () => void;
};

type Status = {tone: "ok" | "bad"; text: string} | null;

/** Message for the first segment that does not match its layout, shown under the GID input. */
function describeInvalidSegment(t: ReturnType<typeof useTranslation>["t"], segment: Segment) {
  if (segment.key === "PADDING") {
    return t("segmentMustBe").replace("{label}", segment.label).replace("{value}", segment.value);
  }

  return t("segmentNeedsDigits").replace("{label}", segment.label).replace("{count}", String(segment.value.length));
}

/** Coloured blocks that show how the typed digits fall into the layout's segments. */
function SegmentStrip({segments}: {segments: Segment[]}) {
  const {t} = useTranslation();

  return (
    <ol className="segment-strip" aria-label={t("segments")}>
      {segments.map((segment, index) => {
        const expectedLength = segment.value.length;
        const missing = Math.max(expectedLength - segment.inpValue.length, 0);
        const incomplete = missing > 0;
        const label = incomplete && segment.inpValue.length > 0
          ? t("segmentProgress")
            .replace("{label}", segment.label)
            .replace("{count}", String(segment.inpValue.length))
            .replace("{total}", String(expectedLength))
          : segment.label;

        return (
          <li key={`${segment.key}-${index}`} className="segment-strip-item">
            <span
              className={segment.isValid ? "segment-block" : "segment-block is-invalid"}
              style={segment.isValid ? {backgroundColor: getSegmentColor(segment.key)} : undefined}
            >
              {segment.inpValue}
              {incomplete && <span className="segment-block-missing" aria-hidden="true">{"_".repeat(missing)}</span>}
            </span>
            <span className={segment.isValid ? "segment-block-label" : "segment-block-label is-invalid"}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function GidInspector({value, onChange, onOpenLayouts}: GidInspectorProps) {
  const {t} = useTranslation();
  const {lang} = useLocale();
  const hintId = useId();
  const gidResult = useMemo(() => parseGid(lang, value), [lang, value]);
  const unknownPrefix = !gidResult && value.length >= 4;
  const firstInvalid = gidResult?.isValid === false ? gidResult.segments.find(segment => !segment.isValid) : undefined;

  let status: Status = null;
  if (gidResult?.isValid) {
    status = {tone: "ok", text: t("gidValid")};
  } else if (unknownPrefix) {
    status = {tone: "bad", text: t("unknownPrefix")};
  } else if (gidResult && /^[0-9]*$/.test(value) && value.length < GID_LENGTH) {
    const missing = GID_LENGTH - value.length;
    status = {tone: "bad", text: missing === 1 ? t("digitMissing") : t("digitsMissing").replace("{count}", String(missing))};
  } else if (gidResult) {
    status = {tone: "bad", text: t("gidInvalid")};
  }

  let hint = t("gidLayoutHint");
  if (unknownPrefix) hint = t("unknownPrefixHint").replace("{prefix}", value.slice(0, 4));
  else if (firstInvalid) hint = describeInvalidSegment(t, firstInvalid);
  else if (gidResult?.isValid) hint = "";

  return (
    <main className="studio-page">
      <header className="studio-page-header studio-page-header-split">
        <div className="studio-page-header-text">
          <h1>{t("titleGiDInspector")}</h1>
          <p>{t("descGiDInspector")}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onOpenLayouts}>
          <GridIcon />{t("gidLayouts")}
        </button>
      </header>

      <section className="studio-card" aria-label={t("gidInput")}>
        <div className="gid-input-panel">
          <div className="gid-input-heading">
            <label htmlFor="inp-gid">GID</label>
            {status && (
              <span className={status.tone === "ok" ? "status-pill is-ok" : "status-pill is-bad"}>
                {status.tone === "ok" ? <CheckIcon /> : <AlertIcon />}{status.text}
              </span>
            )}
          </div>
          <div className="gid-input-field">
            <input
              id="inp-gid"
              className={status?.tone === "bad" ? "gid-input is-invalid" : "gid-input"}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              placeholder={t("GIDPlaceholder")}
              aria-invalid={status?.tone === "bad" || undefined}
              aria-describedby={hintId}
              value={value}
              onChange={event => onChange(event.target.value)}
            />
            {value && (
              <button type="button" className="icon-btn gid-input-clear" aria-label={t("clearGid")} title={t("clearGid")}
                      onClick={() => onChange("")}>
                <XIcon />
              </button>
            )}
          </div>
          <p id={hintId} className="gid-input-hint">
            <span className={status?.tone === "bad" ? "is-invalid" : undefined}>{hint}</span>
            <span>{t("digitProgress").replace("{length}", String(value.length)).replace("{total}", String(GID_LENGTH))}</span>
          </p>
        </div>
        {gidResult && <SegmentStrip segments={gidResult.segments} />}
      </section>

      {gidResult && (
        <SegmentTable
          gid={value}
          gidValid={gidResult.isValid}
          segments={gidResult.segments}
          typeLabel={gidResult.label}
          prefix={value.slice(0, 4)}
        />
      )}

      {unknownPrefix && (
        <section className="studio-card">
          <div className="inspector-notice">
            <p>{t("unknownPrefixHelp")}</p>
            <button type="button" className="btn btn-secondary" onClick={onOpenLayouts}>
              <GridIcon />{t("gidLayouts")}
            </button>
          </div>
        </section>
      )}

      {value === "" && <InspectorStart onPick={onChange} />}
    </main>
  );
}
