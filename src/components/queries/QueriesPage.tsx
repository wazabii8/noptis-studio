import {useEffect, useState} from "react";
import {useTranslation} from "@/i18n/useTranslation";
import {
  createQueryList, deleteQueryList, editQueryList, getQueryLists, isBuiltInList,
  type ListFields, type QueryList,
} from "@/lib/queries";
import QueryForm from "./QueryForm";
import ListQueries from "./ListQueries";
import ManageListForm from "./ManageListForm";

export default function QueriesPage() {
  const {t} = useTranslation();
  const [lists, setLists] = useState<QueryList[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [mode, setMode] = useState<"browse" | "create" | "manage">("browse");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const selected = lists.find(list => list.id === selectedId);
  const manageable = selected && !isBuiltInList(selected.id);

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
    setBusy(true);
    try {
      if (mode === "manage" && selected) {
        const updated = {...selected, title, description};
        await editQueryList(updated);
        setLists(current => current.map(list => list.id === updated.id ? updated : list));
      } else {
        const list = await createQueryList({title, description});
        setLists(current => [...current, list]);
        setSelectedId(list.id);
      }
      setMode("browse");
    } finally {
      setBusy(false);
    }
  }

  async function removeList(id: number) {
    setBusy(true);
    try {
      await deleteQueryList(id);
      const remaining = lists.filter(list => list.id !== id);
      setLists(remaining);
      setSelectedId(remaining[0]?.id);
      setMode("browse");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="queries-page wrapper max-w-2xl card">
      <header className="mb-8">
        <h1 className="headline-2 mb-3">{t("queriesTitle")}</h1>
        <p>{t("queriesIntro")}</p>
      </header>
      {status === "loading" && <p role="status">{t("loading")}</p>}
      {status === "error" && <p role="alert">{t("loadFailed")}</p>}
      {status === "ready" && selected && (
        <>
          <section className="mb-8">
            <label htmlFor="query-list">{t("chooseList")}</label>
            <div className="query-actions">
              <div className="query-list-select">
                <select id="query-list" value={selected.id} disabled={busy} onChange={e => {
                  setSelectedId(Number(e.target.value));
                  setMode("browse");
                }}>
                  {lists.map(list => <option key={list.id} value={list.id}>{list.title}</option>)}
                </select>
              </div>
              <button className="query-secondary" disabled={busy} onClick={() => setMode("create")}>{t("newList")}</button>
              {manageable && (
                <button className="query-secondary" disabled={busy} onClick={() => setMode("manage")}>{t("manageList")}</button>
              )}
            </div>
            {selected.description && <p className="query-description mt-2">{selected.description}</p>}
          </section>
          {mode === "create" ? (
            <QueryForm kind="list" onSave={saveList} onCancel={() => setMode("browse")} />
          ) : mode === "manage" && manageable ? (
            <ManageListForm key={selected.id} list={selected} onSave={saveList} busy={busy}
                            onCancel={() => setMode("browse")} onDelete={() => removeList(selected.id)} />
          ) : (
            <ListQueries key={selected.id} listId={selected.id} />
          )}
        </>
      )}
    </main>
  );
}
