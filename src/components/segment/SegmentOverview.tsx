import {createGidTypes, createSegments} from "@/segments/Segments.ts";
import {useLocale} from "@/i18n/LocaleContext.tsx";
import {Tooltip} from "@/components/ui/Tooltip.tsx";

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
      <td className={"min-w-40 text-sm text-slate-800 border-0"}>{row.label}</td>

      {row.layout.flatMap((value, layoutIndex) => {
        const elemKey = (typeof value === "string" ? "seg-" + value : "seg-pad").toLowerCase();
        const title =
          typeof value === "string"
            ? segments[value as keyof Segments].label
            : "Padding";
        const length =
          typeof value === "string"
            ? segments[value as keyof Segments].length
            : value.index.length;

        return Array.from({length}, (_, index) => (
          <td key={`${layoutIndex}-${index}`} className={elemKey}>
            <Tooltip text={title}>
              <span className={"p-2"}>
                {value === "PREFIX" ? getPrefixCharacter(index, row.prefix) : "0"}
              </span>
            </Tooltip>
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
      <div className={"overflow-x-auto"}>
        <table className={"mt-5 mb-5"}>
          <tbody>
            <TableComp data={segmentObj} />
          </tbody>
        </table>
      </div>
    </>
  );
}

export default SegmentOverview;