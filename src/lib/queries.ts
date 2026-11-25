import {dbPromise} from "./localDb";

export type ListFields = {title: string; description: string};
export type QueryFields = ListFields & {sql: string};
export type QueryList = ListFields & {id: number};
export type SavedQuery = QueryFields & {id: number; listId: number};

export async function getQueryLists(): Promise<QueryList[]> {
  return (await dbPromise).getAll("queryLists");
}

export async function createQueryList(fields: ListFields): Promise<QueryList> {
  const id = await (await dbPromise).add("queryLists", fields);
  return {...fields, id: Number(id)};
}

export async function getListQueries(listId: number): Promise<SavedQuery[]> {
  return (await dbPromise).getAllFromIndex("queries", "listId", listId);
}

export async function addQuery(listId: number, fields: QueryFields): Promise<SavedQuery> {
  const query = {...fields, listId};
  const id = await (await dbPromise).add("queries", query);
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
