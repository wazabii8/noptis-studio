import {useMemo, useState} from "react";
import {createGidTypes, createSegments, getSegmentColor, GID_LENGTH, type GidLayoutItem} from "@/segments/Segments";
import {useLocale} from "@/i18n/LocaleContext";
import {useTranslation} from "@/i18n/useTranslation";
import {t as translate} from "@/i18n/locale";
import {SearchIcon} from "@/components/ui/Icons";

type LayoutSegment = {
  key: string;
  label: string;
  /** Digits shown in the cells: the prefix and fixed padding as typed, "·" where any digit fits. */
  digits: string;
  start: number;
};

type Layout = {
  id: string;
  label: string;
  prefix: string;
  segments: LayoutSegment[];
};

const POSITIONS = Array.from({length: GID_LENGTH}, (_, index) => index + 1);

/** Shows every GID layout as a 16-cell row coloured by segment, with filtering and segment highlighting. */
function SegmentOverview() {
  const {lang} = useLocale();
  const {t} = useTranslation();
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const layouts = useMemo<Layout[]>(() => {
    const definitions = createSegments(lang);

    return Object.entries(createGidTypes(lang)).map(([id, type]) => {
      let start = 1;
      const segments = (type.layout as GidLayoutItem[]).map(item => {
        const isPadding = typeof item !== "string";
        const key = isPadding ? "PADDING" : item;
        const length = isPadding ? item.index.length : definitions[item].length;
        let digits = "·".repeat(length);
        if (isPadding) digits = item.index;
        else if (item === "PREFIX") digits = type.prefix;

        const segment = {key, label: isPadding ? translate(lang, "padding") : definitions[item].label, digits, start};
        start += length;
        return segment;
      });

      return {id, label: type.label, prefix: type.prefix, segments};
    });
  }, [lang]);

  // Segment chips follow the order in which segments first appear in the layouts.
  const legend = useMemo(() => {
    const seen = new Map<string, string>();
    layouts.forEach(layout => layout.segments.forEach(segment => {
      if (!seen.has(segment.key)) seen.set(segment.key, segment.label);
    }));
    return [...seen].map(([key, label]) => ({key, label}));
  }, [layouts]);

  const needle = query.trim().toLowerCase();
  const visible = layouts.filter(layout => !needle
    || layout.label.toLowerCase().includes(needle)
    || layout.prefix.includes(needle));
  const count = visible.length === layouts.length
    ? t("layoutCount").replace("{count}", String(layouts.length))
    : t("layoutCountFiltered").replace("{shown}", String(visible.length)).replace("{count}", String(layouts.length));

  function describe(layout: Layout, segment: LayoutSegment) {
    const length = segment.digits.length;
    const end = segment.start + length - 1;
    const where = length === 1
      ? t("positionSingle").replace("{start}", String(segment.start))
      : t("positionRange").replace("{start}", String(segment.start)).replace("{end}", String(end));
    const digits = length === 1 ? t("digitCountOne") : t("digitCount").replace("{length}", String(length));
    return `${layout.label} (${layout.prefix}) · ${segment.label} · ${where}, ${digits}`;
  }

  return (
    <div className="layouts">
      <div className="layouts-toolbar">
        <div className="layouts-search">
          <SearchIcon />
          <input type="search" aria-label={t("filterLayouts")} placeholder={t("filterLayouts")}
                 value={query} onChange={event => setQuery(event.target.value)} />
        </div>
        <span className="layouts-count">{count}</span>
      </div>

      <div className="layouts-legend">
        <div className="layouts-legend-heading">
          <span>{t("segmentsHighlightHint")}</span>
          {focus && <button type="button" className="text-button" onClick={() => setFocus(null)}>{t("clearHighlight")}</button>}
        </div>
        <div className="layouts-chips">
          {legend.map(({key, label}) => (
            <button key={key} type="button" className="layouts-chip" aria-pressed={focus === key}
                    onClick={() => setFocus(focus === key ? null : key)}>
              <span className="layouts-swatch" style={{backgroundColor: getSegmentColor(key)}} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="layouts-detail" aria-live="polite">{hover ?? t("layoutsHoverHint")}</p>

      <div className="layouts-scroll" onMouseLeave={() => setHover(null)}>
        <table className="layouts-table">
          <thead>
            <tr>
              <th scope="col" className="layouts-type-heading">{t("typeAndPrefix")}</th>
              <th scope="col">
                <span className="layouts-cells" aria-hidden="true">
                  {POSITIONS.map(position => <span key={position} className="layouts-position">{position}</span>)}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map(layout => (
              <tr key={layout.id}>
                <th scope="row">
                  <span className="layouts-type">{layout.label}</span>
                  <span className="layouts-prefix">{layout.prefix}</span>
                </th>
                <td>
                  <span className="layouts-cells" role="img"
                        aria-label={`${layout.label}: ${layout.segments.map(segment => `${segment.label} ${segment.digits.length}`).join(", ")}`}>
                    {layout.segments.flatMap(segment => [...segment.digits].map((digit, index) => (
                      <span
                        key={`${segment.start}-${index}`}
                        className="layouts-cell"
                        title={segment.label}
                        data-first={index === 0 || undefined}
                        data-last={index === segment.digits.length - 1 || undefined}
                        style={{
                          backgroundColor: getSegmentColor(segment.key),
                          opacity: focus && focus !== segment.key ? 0.16 : 1,
                        }}
                        onMouseEnter={() => setHover(describe(layout, segment))}
                      >
                        {digit}
                      </span>
                    )))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="layouts-empty">{t("noLayoutMatch").replace("{query}", query.trim())}</p>}
      </div>

      <p className="layouts-footnote">{t("layoutsFootnote")}</p>
    </div>
  );
}

export default SegmentOverview;
