import {createGidTypes, createSegments} from "@/segments/Segments.ts";
import {useLocale} from "@/i18n/LocaleContext.tsx";


type GidTypes = ReturnType<typeof createGidTypes>;
type Segments = ReturnType<typeof createSegments>;

type TableCompProps = {
  data: GidTypes;
};

/**
 * Returns the character at the specified index in the prefix string.
 *
 * @param index
 * @param prefix
 */
function getPrefixCharacter(index: number, prefix: string): string {
  return prefix[index] ?? "";
}

/**
 * Renders a table component with the provided data.
 *
 * @param data
 * @constructor
 */
function TableComp({data}: TableCompProps) {
  const {lang} = useLocale();
  const segments = createSegments(lang);

  return Object.entries(data).map(([key, row]) => (
    <tr key={key}>
      <td className={"min-w-40 text-sm text-slate-800"}>{row.label}</td>

      {row.layout.flatMap((value, layoutIndex) => {
        const elemKey = (typeof value === "string" ? "seg-" + value : "seg-pad").toLowerCase();
        const elemValue = (typeof value === "string" ? "" : "");
        const title =
          typeof value === "string"
            ? segments[value as keyof Segments].label
            : "Padding";
        const length =
          typeof value === "string"
            ? segments[value as keyof Segments].length
            : value.index.length;

        return Array.from({length}, (_, index) => (
          <td key={`${layoutIndex}-${index}`} className={elemKey} title={title}>
            {value === "PREFIX" ? getPrefixCharacter(index, row.prefix) : elemValue}
          </td>
        ));
      })}
    </tr>
  ));
}

/**
 * Renders a segment overview component with a table.
 *
 * @constructor
 */
function SegmentOverview() {
  const {lang} = useLocale();
  const segmentObj = createGidTypes(lang);

  return (
    <>
      <table>
        <tbody>
          <TableComp data={segmentObj} />
        </tbody>
      </table>
    </>
  );
}

export default SegmentOverview;