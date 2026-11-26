import {useEffect, useState} from "react";
import {useDbVersion} from "@/lib/dbChanges";
import {useLocale} from "@/i18n/LocaleContext";
import {useTranslation} from "@/i18n/useTranslation";
import {deleteGidSegment, getAllGidSegments, saveManagedGidSegment, type GidSegmentValue} from "@/lib/localDb";
import {createSegments, GID_LENGTH, type SavedNumberKind} from "@/segments/Segments";
import {parseGid} from "@/utils/Helpers";
import {PencilIcon, PlusIcon, SearchIcon} from "@/components/ui/Icons";
import SegmentForm from "./SegmentForm";

const sections = [
  {kind: "GID", heading: "savedGidNumbers"},
  {kind: "THM", heading: "savedTransportAuthorities"},
  {kind: "CONTRACTOR", heading: "savedTransportOperators"},
] as const;

type SavedNumbersSectionProps = {
  kind: SavedNumberKind;
  heading: string;
  records: GidSegmentValue[];
  onSave: (record: GidSegmentValue, originalKey?: string) => void;
  onDelete: (key: string) => void;
  onInspect: (gid: string) => void;
};

/** Shows a saved GID split into its layout segments, with the GID type underneath. */
function SavedGidNumber({gid}: {gid: string}) {
  const {lang} = useLocale();
  const result = parseGid(lang, gid);

  if (!result) return <div className="saved-number">{gid}</div>;

  return (
    <div>
      <div className="saved-number" aria-label={gid}>
        {result.segments.map((segment, index) => <span key={index}>{segment.inpValue}</span>)}
      </div>
      <span className="saved-type">{result.label}</span>
    </div>
  );
}

function SavedNumbersSection({kind, heading, records, onSave, onDelete, onInspect}: SavedNumbersSectionProps) {
  const {t} = useTranslation();
  const {lang} = useLocale();
  const [editing, setEditing] = useState<GidSegmentValue | null>(null);
  const [adding, setAdding] = useState(false);
  const headingId = `saved-numbers-${kind}`;
  const prefix = `${kind}_`;
  const isGid = kind === "GID";
  const digits = isGid ? GID_LENGTH : createSegments(lang)[kind].length;
  const busy = adding || editing !== null;

  const visible = editing && !records.some(record => record.key === editing.key) ? [...records, editing] : records;

  async function save(number: string, value: string, original?: GidSegmentValue) {
    const record = await saveManagedGidSegment(prefix + number, value, original?.key, original?.revision);
    onSave(record, original?.key);
    setAdding(false);
    setEditing(null);
  }

  return (
    <section className="studio-card" aria-labelledby={headingId}>
      <div className="studio-card-header">
        <div className="studio-card-heading">
          <h2 id={headingId} className="studio-card-title">{heading}</h2>
          <span className="count-pill">{records.length}</span>
          <span className="studio-card-meta">{t("digitCount").replace("{length}", String(digits))}</span>
        </div>
        <button type="button" className="btn btn-add" disabled={busy} onClick={() => setAdding(true)}>
          <PlusIcon />{t("add")}
        </button>
      </div>
      {adding && (
        <SegmentForm kind={kind} number="" editNumber onSave={save} onCancel={() => setAdding(false)} />
      )}
      {visible.length === 0 && !adding && <p className="studio-card-empty">{t("noSavedNumbers")}</p>}
      {visible.length > 0 && (
        <ul>
          {visible.map(record => {
            const number = record.key.slice(prefix.length);

            if (editing?.key === record.key) {
              return (
                <li key={record.key}>
                  <SegmentForm
                    kind={kind}
                    number={number}
                    initialText={editing.value}
                    editNumber
                    onSave={(number, value) => save(number, value, editing)}
                    onCancel={() => setEditing(null)}
                    onDelete={async () => {
                      await deleteGidSegment(editing.key, editing.revision);
                      onDelete(record.key);
                      setEditing(null);
                    }}
                  />
                </li>
              );
            }

            return (
              <li key={record.key} className="saved-row">
                {isGid ? <SavedGidNumber gid={number} /> : <div className="saved-number">{number}</div>}
                {record.value ? (
                  <p className="saved-name">{record.value}</p>
                ) : (
                  <p className="saved-name saved-name-empty">{t(isGid ? "noDescription" : "noOrganizationName")}</p>
                )}
                <div className="saved-row-actions">
                  {isGid && (
                    <a className="icon-btn" href="#gid" aria-label={`${t("openInInspector")} ${number}`}
                       title={t("openInInspector")} onClick={() => onInspect(number)}>
                      <SearchIcon />
                    </a>
                  )}
                  <button type="button" className="icon-btn" aria-label={`${t("edit")} ${number}`} title={t("edit")}
                          disabled={busy} onClick={() => setEditing(record)}>
                    <PencilIcon />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

type SavedNumbersPageProps = {
  onInspect: (gid: string) => void;
};

export default function SavedNumbersPage({onInspect}: SavedNumbersPageProps) {
  const {t} = useTranslation();
  const dbVersion = useDbVersion();
  const [records, setRecords] = useState<GidSegmentValue[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getAllGidSegments().then(records => {
      if (active) setRecords(records);
    }).catch(() => {
      if (active) setLoadFailed(true);
    });
    return () => { active = false; };
  }, [dbVersion]);

  return (
    <main className="studio-page">
      <header className="studio-page-header">
        <h1>{t("savedNumbersTitle")}</h1>
        <p>{t("savedNumbersIntro")}</p>
      </header>
      {loadFailed && <p role="alert">{t("loadFailed")}</p>}
      {!loadFailed && records === null && <p role="status">{t("loading")}</p>}
      {records !== null && sections.map(({kind, heading}) => (
        <SavedNumbersSection
          key={kind}
          kind={kind}
          heading={t(heading)}
          records={records.filter(record => record.key.startsWith(`${kind}_`))
            .sort((first, second) => first.key.localeCompare(second.key))}
          onSave={(record, originalKey) => setRecords(current => [
            ...(current ?? []).filter(item => item.key !== originalKey && item.key !== record.key),
            record,
          ])}
          onDelete={key => setRecords(current => current?.filter(record => record.key !== key) ?? [])}
          onInspect={onInspect}
        />
      ))}
    </main>
  );
}
