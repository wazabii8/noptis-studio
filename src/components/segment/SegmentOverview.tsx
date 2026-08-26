import {createGidTypes, createSegments} from "@/segments/Segments.ts";
import {useLocale} from "@/i18n/LocaleContext.tsx";

type SegmentOverviewProps = {
  title: string;
};

type GidTypes = ReturnType<typeof createGidTypes>;
type Segments = ReturnType<typeof createSegments>;

type TableCompProps = {
  data: GidTypes;
};

function TableComp({data}: TableCompProps) {
  const {lang} = useLocale();
  const segments = createSegments(lang);

  return Object.entries(data).map(([key, row]) => (
    <tr key={key}>
      <td>{row.prefix}</td>

      {row.layout.flatMap((value, layoutIndex) => {
        const elemKey = (typeof value === "string" ? "seg-"+value : "seg-pad").toLowerCase();
        const elemValue = (typeof value === "string" ? "" : "");
        const length =
          typeof value === "string"
            ? segments[value as keyof Segments].length
            : value.index.length;

        return Array.from({length}, (_, index) => (
          <td key={`${layoutIndex}-${index}`} className={elemKey}>{elemValue}</td>
        ));
      })}
    </tr>
  ));
}

function SegmentOverview({title}: SegmentOverviewProps) {
  const {lang} = useLocale();
  const test = createGidTypes(lang);

  return (
    <>
      <h2>{title}</h2>

      <table>
        <tbody>
        <TableComp data={test} />
        </tbody>
      </table>
    </>
  );
}

export default SegmentOverview;