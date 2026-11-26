import {useEffect, useState} from "react";
import {useDbVersion} from "@/lib/dbChanges";
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
  const dbVersion = useDbVersion();
  const [editingList, setEditingList] = useState<QueryList>();
  const [queryDraftList, setQueryDraftList] = useState<QueryList>();
  const [lists, setLists] = useState<QueryList[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [mode, setMode] = useState<"browse" | "create" | "manage">("browse");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const pinned = editingList ?? queryDraftList;
  const selected = lists.find(list => list.id === selectedId) ?? pinned ?? lists[0];
  const visible = pinned && !lists.some(list => list.id === pinned.id) ? [...lists, pinned] : lists;
  const manageable = selected && !isBuiltInList(selected.id);

  useEffect(() => {
    let active = true;
    getQueryLists().then(saved => {
      if (!active) return;
      setLists(saved);
      setStatus("ready");
    }).catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, [dbVersion]);

  async function saveList({title, description}: ListFields) {
    setBusy(true);
    try {
      if (mode === "manage" && editingList) {
        const updated = await editQueryList({...editingList, title, description});
        setLists(current => current.map(list => list.id === updated.id ? updated : list));
      } else {
        const list = await createQueryList({title, description});
        setLists(current => [...current, list]);
        setSelectedId(list.id);
      }
      setEditingList(undefined);
      setMode("browse");
    } finally {
      setBusy(false);
    }
  }

  async function removeList(list: QueryList, count: number | undefined) {
    setBusy(true);
    try {
      await deleteQueryList(list.id, list.revision, count);
      const remaining = lists.filter(item => item.id !== list.id);
      setLists(remaining);
      setSelectedId(remaining[0]?.id);
      setEditingList(undefined);
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
                  setEditingList(undefined);
                  setQueryDraftList(undefined);
                  setMode("browse");
                }}>
                  {visible.map(list => <option key={list.id} value={list.id}>{list.title}</option>)}
                </select>
              </div>
              <button className="query-secondary" disabled={busy || Boolean(queryDraftList)} onClick={() => setMode("create")}>{t("newList")}</button>
              {manageable && (
                <button className="query-secondary" disabled={busy || Boolean(queryDraftList)} onClick={() => { setEditingList(selected); setSelectedId(selected.id); setMode("manage"); }}>{t("manageList")}</button>
              )}
            </div>
            {selected.description && <p className="query-description mt-2">{selected.description}</p>}
          </section>
          {mode === "create" ? (
            <QueryForm kind="list" onSave={saveList} onCancel={() => setMode("browse")} />
          ) : mode === "manage" && editingList ? (
            <ManageListForm key={editingList.id} list={editingList} onSave={saveList} busy={busy}
                            onCancel={() => { setEditingList(undefined); setMode("browse"); }} onDelete={count => removeList(editingList, count)} />
          ) : (
            <ListQueries key={selected.id} listId={selected.id} onDraft={active => {
              if (active) setSelectedId(selected.id);
              setQueryDraftList(active ? selected : undefined);
            }} />
          )}
        </>
      )}
    </main>
  );
}
