import {useEffect, useState} from "react";
import {useDbVersion} from "@/lib/dbChanges";
import {useTranslation} from "@/i18n/useTranslation";
import {addQuery, getListQueries, type QueryFields, type QueryList, type SavedQuery} from "@/lib/queries";
import {PlusIcon} from "@/components/ui/Icons";
import QueryForm from "./QueryForm";
import QueryRow from "./QueryRow";

type Props = {
  list: QueryList;
  onDraft: (active: boolean) => void;
};

export default function ListQueries({list, onDraft}: Props) {
  const listId = list.id;
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
    <section className="studio-card" aria-labelledby="query-list-heading">
      <div className="studio-card-header">
        <div className="studio-card-heading">
          <h2 id="query-list-heading" className="studio-card-title">{list.title}</h2>
          <span className="count-pill">{queries.length}</span>
          {list.description && <p className="studio-card-description">{list.description}</p>}
        </div>
        <button type="button" className="btn btn-primary" disabled={adding} onClick={() => setFormOpen(true)}>
          <PlusIcon />{t("addQuery")}
        </button>
      </div>
      {adding && (
        <div className="edit-panel">
          <QueryForm kind="query" onSave={saveNew} onCancel={() => setFormOpen(false)} />
        </div>
      )}
      {visible.length === 0 && !adding && <p className="studio-card-empty">{t("noQueries")}</p>}
      {visible.length > 0 && (
        <ul>
          {visible.map(query => (
            <QueryRow key={query.id} query={query} onDraft={active => rowDraft(query, active)}
                      onEdit={updated => setQueries(current => current.map(item => item.id === updated.id ? updated : item))}
                      onDelete={() => setQueries(current => current.filter(item => item.id !== query.id))} />
          ))}
        </ul>
      )}
    </section>
  );
}
