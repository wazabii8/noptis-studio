import {useEffect, useState} from "react";
import {useTranslation} from "@/i18n/useTranslation";
import {addQuery, getListQueries, type QueryFields, type SavedQuery} from "@/lib/queries";
import QueryForm from "./QueryForm";
import QueryRow from "./QueryRow";

export default function ListQueries({listId}: {listId: number}) {
  const {t} = useTranslation();
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
  }, [listId]);

  async function saveNew(fields: QueryFields) {
    const query = await addQuery(listId, fields);
    setQueries(current => [...current, query]);
    setAdding(false);
  }

  if (loading) return <p role="status">{t("loading")}</p>;
  if (failed) return <p role="alert">{t("loadFailed")}</p>;

  return (
    <>
      {adding ? (
        <QueryForm kind="query" onSave={saveNew} onCancel={() => setAdding(false)} />
      ) : (
        <button className="query-primary" onClick={() => setAdding(true)}>{t("addQuery")}</button>
      )}
      <ul className="mt-6">
        {queries.map(query => (
          <QueryRow key={query.id} query={query}
                    onEdit={updated => setQueries(current => current.map(item => item.id === updated.id ? updated : item))}
                    onDelete={() => setQueries(current => current.filter(item => item.id !== query.id))} />
        ))}
      </ul>
    </>
  );
}
