import {useEffect, useState} from "react";
import {useTranslation} from "@/i18n/useTranslation";
import {createQueryList, getQueryLists, type ListFields, type QueryList} from "@/lib/queries";
import QueryForm from "./QueryForm";
import ListQueries from "./ListQueries";

export default function QueriesPage() {
  const {t} = useTranslation();
  const [lists, setLists] = useState<QueryList[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const selected = lists.find(list => list.id === selectedId);

  useEffect(() => {
    let active = true;
    getQueryLists().then(saved => {
      if (!active) return;
      setLists(saved);
      setSelectedId(saved[0]?.id);
      setStatus("ready");
    }).catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, []);

  async function saveList({title, description}: ListFields) {
    const list = await createQueryList({title, description});
    setLists(current => [...current, list]);
    setSelectedId(list.id);
    setCreating(false);
  }

  return (
    <main className="queries-page wrapper max-w-2xl card">
      <header className="mb-8">
        <h1 className="headline-2 mb-3">{t("queriesTitle")}</h1>
        <p>{t("queriesIntro")}</p>
      </header>
      {status === "loading" && <p role="status">{t("loading")}</p>}
      {status === "error" && <p role="alert">{t("loadFailed")}</p>}
      {status === "ready" && (
        <>
          {selected && (
            <section className="mb-8">
              <label htmlFor="query-list">{t("chooseList")}</label>
              <div className="query-actions">
                <div className="query-list-select">
                  <select id="query-list" value={selected.id} onChange={e => {
                    setSelectedId(Number(e.target.value));
                    setCreating(false);
                  }}>
                    {lists.map(list => <option key={list.id} value={list.id}>{list.title}</option>)}
                  </select>
                </div>
                <button className="query-secondary" onClick={() => setCreating(true)}>{t("newList")}</button>
              </div>
              {selected.description && <p className="query-description mt-2">{selected.description}</p>}
            </section>
          )}
          {creating ? (
            <QueryForm kind="list" onSave={saveList} onCancel={() => setCreating(false)} />
          ) : selected ? (
            <ListQueries key={selected.id} listId={selected.id} />
          ) : (
            <button className="query-primary" onClick={() => setCreating(true)}>{t("firstList")}</button>
          )}
        </>
      )}
    </main>
  );
}
