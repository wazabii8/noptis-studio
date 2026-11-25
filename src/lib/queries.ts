import {dbPromise} from "./localDb";

export type ListFields = {title: string; description: string};
export type QueryFields = ListFields & {sql: string};
export type QueryList = ListFields & {id: number};
export type SavedQuery = QueryFields & {id: number; listId: number};

// IndexedDB assigns positive IDs to user-created lists.
const builtInLists = [{id: -1, title: "DOI"}, {id: -2, title: "ROI"}];

export function isBuiltInList(id: number) {
  return builtInLists.some(list => list.id === id);
}

export function isBuiltInListTitle(title: string) {
  return builtInLists.some(list => list.title === title.trim().toUpperCase());
}

export async function getQueryLists(): Promise<QueryList[]> {
  const tx = (await dbPromise).transaction(["queryLists", "queries"], "readwrite");
  const listStore = tx.objectStore("queryLists");
  const queryIndex = tx.objectStore("queries").index("listId");
  const savedLists: QueryList[] = await listStore.getAll();
  const pinned: QueryList[] = [];
  const custom = savedLists.filter(list => !isBuiltInList(list.id) && !isBuiltInListTitle(list.title));

  for (const builtIn of builtInLists) {
    const saved = savedLists.find(list => list.id === builtIn.id);
    const legacy = savedLists.filter(list =>
      !isBuiltInList(list.id) && list.title.trim().toUpperCase() === builtIn.title
    );
    const description = [saved, ...legacy].map(list => list?.description).filter(Boolean).join("\n\n");
    const list = {...builtIn, description};
    if (!saved || legacy.length > 0) await listStore.put(list);

    for (const oldList of legacy) {
      let cursor = await queryIndex.openCursor(oldList.id);
      while (cursor) {
        await cursor.update({...cursor.value, listId: builtIn.id});
        cursor = await cursor.continue();
      }
      await listStore.delete(oldList.id);
    }
    pinned.push(list);
  }

  await tx.done;
  return [...pinned, ...custom];
}

export async function createQueryList(fields: ListFields): Promise<QueryList> {
  if (isBuiltInListTitle(fields.title)) throw new Error("Built-in list title");
  const id = await (await dbPromise).add("queryLists", fields);
  return {...fields, id: Number(id)};
}

export async function editQueryList(list: QueryList) {
  if (isBuiltInList(list.id) || isBuiltInListTitle(list.title)) throw new Error("Built-in list");
  const tx = (await dbPromise).transaction("queryLists", "readwrite");
  const cursor = await tx.store.openCursor(list.id);
  if (!cursor) throw new Error("List no longer exists");
  await cursor.update(list);
  await tx.done;
}

export async function deleteQueryList(listId: number) {
  if (isBuiltInList(listId)) throw new Error("Built-in list");
  const tx = (await dbPromise).transaction(["queryLists", "queries"], "readwrite");
  const index = tx.objectStore("queries").index("listId");
  let cursor = await index.openCursor(listId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.objectStore("queryLists").delete(listId);
  await tx.done;
}

export async function getListQueries(listId: number): Promise<SavedQuery[]> {
  return (await dbPromise).getAllFromIndex("queries", "listId", listId);
}

export async function countListQueries(listId: number): Promise<number> {
  return (await dbPromise).countFromIndex("queries", "listId", listId);
}

export async function addQuery(listId: number, fields: QueryFields): Promise<SavedQuery> {
  const tx = (await dbPromise).transaction(["queryLists", "queries"], "readwrite");
  const listKey = await tx.objectStore("queryLists").getKey(listId);
  if (listKey === undefined) throw new Error("List no longer exists");
  const query = {...fields, listId};
  const id = await tx.objectStore("queries").add(query);
  await tx.done;
  return {...query, id: Number(id)};
}

export async function editQuery(query: SavedQuery) {
  const tx = (await dbPromise).transaction("queries", "readwrite");
  const cursor = await tx.store.openCursor(query.id);
  if (!cursor) throw new Error("Query no longer exists");
  await cursor.update(query);
  await tx.done;
}

export async function deleteQuery(id: number) {
  await (await dbPromise).delete("queries", id);
}
