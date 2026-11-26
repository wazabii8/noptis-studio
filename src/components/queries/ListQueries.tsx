import {useEffect, useState} from "react";
import {useDbVersion} from "@/lib/dbChanges";
import {useTranslation} from "@/i18n/useTranslation";
import {addQuery, getListQueries, type QueryFields, type SavedQuery} from "@/lib/queries";
import QueryForm from "./QueryForm";
import QueryRow from "./QueryRow";

export default function ListQueries({listId, onDraft}: {listId: number; onDraft: (active: boolean) => void}) {
  const {t} = useTranslation();
  const dbVersion = useDbVersion();
  const [drafts, setDrafts] = useState<SavedQuery[]>([]);
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;
    getListQueries(listId).then(saved => {
      if (active) setQueries(saved);
    }).catch(() => {
      if (active) setFailed(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [listId, dbVersion]);

  const visible = [...queries, ...drafts.filter(draft => !queries.some(query => query.id === draft.id))]
    .sort((first, second) => first.id - second.id);

  function rowDraft(query: SavedQuery, active: boolean) {
    const next = [...drafts.filter(draft => draft.id !== query.id), ...(active ? [query] : [])];
    setDrafts(next);
    onDraft(adding || next.length > 0);
  }

  function setFormOpen(open: boolean) {
    setAdding(open);
    onDraft(open || drafts.length > 0);
  }

  async function saveNew(fields: QueryFields) {
    const query = await addQuery(listId, fields);
    setQueries(current => [...current, query]);
    setFormOpen(false);
  }

  if (loading) return <p role="status">{t("loading")}</p>;
  if (failed) return <p role="alert">{t("loadFailed")}</p>;

  return (
    <>
      {adding ? (
        <QueryForm kind="query" onSave={saveNew} onCancel={() => setFormOpen(false)} />
      ) : (
        <button className="query-primary" onClick={() => setFormOpen(true)}>{t("addQuery")}</button>
      )}
      <ul className="mt-6">
        {visible.map(query => (
          <QueryRow key={query.id} query={query} onDraft={active => rowDraft(query, active)}
                    onEdit={updated => setQueries(current => current.map(item => item.id === updated.id ? updated : item))}
                    onDelete={() => setQueries(current => current.filter(item => item.id !== query.id))} />
        ))}
      </ul>
    </>
  );
}
