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
import {ChevronDownIcon, PencilIcon, PlusIcon} from "@/components/ui/Icons";

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
    <main className="studio-page queries-page">
      <header className="studio-page-header">
        <h1>{t("queriesTitle")}</h1>
        <p>{t("queriesIntro")}</p>
      </header>
      {status === "loading" && <p role="status">{t("loading")}</p>}
      {status === "error" && <p role="alert">{t("loadFailed")}</p>}
      {status === "ready" && selected && (
        <>
          <section className="list-picker">
            <label htmlFor="query-list">{t("chooseList")}</label>
            <div className="list-picker-controls">
              <div className="query-list-select">
                <select id="query-list" value={selected.id} disabled={busy} onChange={e => {
                  setSelectedId(Number(e.target.value));
                  setEditingList(undefined);
                  setQueryDraftList(undefined);
                  setMode("browse");
                }}>
                  {visible.map(list => <option key={list.id} value={list.id}>{list.title}</option>)}
                </select>
                <ChevronDownIcon />
              </div>
              {manageable && (
                <button type="button" className="btn btn-secondary btn-tall" disabled={busy || Boolean(queryDraftList)}
                        onClick={() => { setEditingList(selected); setSelectedId(selected.id); setMode("manage"); }}>
                  <PencilIcon />{t("manageList")}
                </button>
              )}
              <button type="button" className="btn btn-secondary btn-tall" disabled={busy || Boolean(queryDraftList)}
                      onClick={() => setMode("create")}>
                <PlusIcon />{t("newList")}
              </button>
            </div>
          </section>
          {mode === "create" ? (
            <section className="studio-card form-card">
              <QueryForm kind="list" onSave={saveList} onCancel={() => setMode("browse")} />
            </section>
          ) : mode === "manage" && editingList ? (
            <section className="studio-card form-card">
              <ManageListForm key={editingList.id} list={editingList} onSave={saveList} busy={busy}
                              onCancel={() => { setEditingList(undefined); setMode("browse"); }}
                              onDelete={count => removeList(editingList, count)} />
            </section>
          ) : (
            <ListQueries key={selected.id} list={selected} onDraft={active => {
              if (active) setSelectedId(selected.id);
              setQueryDraftList(active ? selected : undefined);
            }} />
          )}
        </>
      )}
    </main>
  );
}
