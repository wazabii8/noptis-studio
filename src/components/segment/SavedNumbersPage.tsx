import {useEffect, useState} from "react";
import {useDbVersion} from "@/lib/dbChanges";
import {useTranslation} from "@/i18n/useTranslation";
import {deleteGidSegment, getAllGidSegments, saveManagedGidSegment, type GidSegmentValue} from "@/lib/localDb";
import {type SavedNumberKind} from "@/segments/Segments";
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
};

function SavedNumbersSection({kind, heading, records, onSave, onDelete}: SavedNumbersSectionProps) {
  const {t} = useTranslation();
  const [editing, setEditing] = useState<GidSegmentValue | null>(null);
  const [adding, setAdding] = useState(false);
  const headingId = `saved-numbers-${kind}`;
  const prefix = `${kind}_`;

  const visible = editing && !records.some(record => record.key === editing.key) ? [...records, editing] : records;

  async function save(number: string, value: string, original?: GidSegmentValue) {
    const record = await saveManagedGidSegment(prefix + number, value, original?.key, original?.revision);
    onSave(record, original?.key);
    setAdding(false);
    setEditing(null);
  }

  return (
    <section className="saved-numbers-section" aria-labelledby={headingId}>
      <div className="saved-numbers-heading">
        <h2 id={headingId} className="headline-4">{heading}</h2>
        <button type="button" className="query-secondary" disabled={adding || editing !== null}
                onClick={() => setAdding(true)}>{t("add")}</button>
      </div>
      {adding && (
        <SegmentForm kind={kind} number="" editNumber onSave={save} onCancel={() => setAdding(false)} />
      )}
      {visible.length === 0 && !adding && <p className="saved-numbers-empty">{t("noSavedNumbers")}</p>}
      {visible.length > 0 && (
        <ul>
          {visible.map(record => {
            const number = record.key.slice(prefix.length);

            return (
              <li key={record.key} className="saved-number-row">
                {editing?.key === record.key ? (
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
                ) : (
                  <div className="saved-number-summary">
                    <div className="min-w-0">
                      <strong className="saved-number">{number}</strong>
                      {record.value && <p className="query-description mt-1">{record.value}</p>}
                    </div>
                    <button type="button" className="query-secondary" aria-label={`${t("edit")} ${number}`}
                            disabled={adding || editing !== null}
                            onClick={() => setEditing(record)}>{t("edit")}</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function SavedNumbersPage() {
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
    <main className="saved-numbers-page wrapper max-w-2xl card">
      <header className="mb-8">
        <a className="saved-numbers-link" href="#gid">{t("backToInspector")}</a>
        <h1 className="headline-2 mt-3">{t("savedNumbersTitle")}</h1>
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
        />
      ))}
    </main>
  );
}
