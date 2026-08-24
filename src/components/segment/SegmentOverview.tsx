import {useTranslation} from "@/i18n/useTranslation.ts";
import {createGidTypes} from "@/segments/Segments.ts";
import {useLocale} from "@/i18n/LocaleContext.tsx";

type SegmentOverviewProps = {
  title: string;
};

function SegmentOverview({title}: SegmentOverviewProps) {
  const {lang} = useLocale();
  const {t} = useTranslation();
  const test = createGidTypes(lang);

  const TableComp = ({data}) => {

    return Object.entries(data).map(([key, row]) => (
      <tr key={key}>
        <td>{row.prefix}</td>
        <td>0</td>
      </tr>
    ));
  };


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