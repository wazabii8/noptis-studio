import {checkRevision, dbPromise, queueDocument, StaleRecordError, writeStudio} from "./localDb";
import type {QueryList, SavedQuery} from "./localDb";
import {builtInLists, isBuiltInList, isBuiltInListTitle, makeDocument} from "./syncRecords";
import type {ListFields, QueryFields} from "./syncRecords";

export type {QueryList, SavedQuery, ListFields, QueryFields};
export {isBuiltInList, isBuiltInListTitle};

export async function getQueryLists(): Promise<QueryList[]> {
  const lists = await (await dbPromise).getAll("queryLists") as QueryList[];
  const pinned = builtInLists.map(builtIn => lists.find(list => list.id === builtIn.id)!);
  return [...pinned, ...lists.filter(list => !isBuiltInList(list.id))];
}

export async function createQueryList(fields: ListFields): Promise<QueryList> {
  if (isBuiltInListTitle(fields.title)) throw new Error("Built-in list title");
  return writeStudio(async tx => {
    const syncId = crypto.randomUUID();
    const doc = makeDocument("list", syncId, fields);
    const list = {...fields, syncId, revision: doc.revision};
    const id = await tx.objectStore("queryLists").add(list);
    await queueDocument(tx.objectStore("syncRecords"), doc);
    return {...list, id};
  });
}

export async function editQueryList(list: QueryList) {
  if (isBuiltInList(list.id) || isBuiltInListTitle(list.title)) throw new Error("Built-in list");
  return writeStudio(async tx => {
    const store = tx.objectStore("queryLists");
    const current = await store.get(list.id);
    if (!current) throw new StaleRecordError();
    checkRevision(current.revision, list.revision);
    const doc = makeDocument("list", current.syncId, {title: list.title, description: list.description});
    const updated = {...list, syncId: current.syncId, revision: doc.revision};
    await store.put(updated);
    await queueDocument(tx.objectStore("syncRecords"), doc);
    return updated;
  });
}

export async function deleteQueryList(listId: number, expected?: string, expectedCount?: number) {
  if (isBuiltInList(listId)) throw new Error("Built-in list");
  await writeStudio(async tx => {
    const listStore = tx.objectStore("queryLists");
    const list = await listStore.get(listId);
    checkRevision(list?.revision, expected);
    if (!list) return;
    const index = tx.objectStore("queries").index("listId");
    if (expectedCount !== undefined && await index.count(listId) !== expectedCount) throw new StaleRecordError();
    let cursor = await index.openCursor(listId);
    while (cursor) {
      await queueDocument(tx.objectStore("syncRecords"), makeDocument("query", cursor.value.syncId, null));
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await listStore.delete(listId);
    await queueDocument(tx.objectStore("syncRecords"), makeDocument("list", list.syncId, null));
  });
}

export async function getListQueries(listId: number): Promise<SavedQuery[]> {
  return (await dbPromise).getAllFromIndex("queries", "listId", listId) as Promise<SavedQuery[]>;
}

export async function countListQueries(listId: number): Promise<number> {
  return (await dbPromise).countFromIndex("queries", "listId", listId);
}

export async function addQuery(listId: number, fields: QueryFields): Promise<SavedQuery> {
  return writeStudio(async tx => {
    const list = await tx.objectStore("queryLists").get(listId);
    if (!list) throw new StaleRecordError();
    const syncId = crypto.randomUUID();
    const doc = makeDocument("query", syncId, {...fields, parent: list.syncId});
    const query = {...fields, listId, syncId, revision: doc.revision};
    const id = await tx.objectStore("queries").add(query);
    await queueDocument(tx.objectStore("syncRecords"), doc);
    return {...query, id};
  });
}

export async function editQuery(query: SavedQuery) {
  return writeStudio(async tx => {
    const {id, title, description, sql} = query;
    const store = tx.objectStore("queries");
    const current = await store.get(id);
    if (!current) throw new StaleRecordError();
    checkRevision(current.revision, query.revision);
    const parent = await tx.objectStore("queryLists").get(current.listId);
    if (!parent) throw new StaleRecordError();
    const doc = makeDocument("query", current.syncId, {title, description, sql, parent: parent.syncId});
    const updated = {...query, listId: current.listId, syncId: current.syncId, revision: doc.revision};
    await store.put(updated);
    await queueDocument(tx.objectStore("syncRecords"), doc);
    return updated;
  });
}

export async function deleteQuery(id: number, expected?: string) {
  await writeStudio(async tx => {
    const store = tx.objectStore("queries");
    const query = await store.get(id);
    checkRevision(query?.revision, expected);
    if (!query) return;
    await store.delete(id);
    await queueDocument(tx.objectStore("syncRecords"), makeDocument("query", query.syncId, null));
  });
}
