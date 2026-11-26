import {openDB} from "idb";
import type {DBSchema, IDBPTransaction} from "idb";
import {notifyDbChange} from "./dbChanges";
import {builtInLists, documentPath, isBuiltInListTitle, makeDocument} from "./syncRecords";
import type {ListFields, QueryFields, SyncDocument, SyncRecord} from "./syncRecords";

export type GidSegmentValue = {
  key: string;
  value: string;
  updatedAt: string;
  revision: string;
};

export type QueryList = ListFields & {id: number; syncId: string; revision: string};
export type SavedQuery = QueryFields & {id: number; listId: number; syncId: string; revision: string};
export type SyncSettings = {account?: string; enabled?: boolean; lastSync?: string};

interface StudioDb extends DBSchema {
  gidSegments: {key: string; value: GidSegmentValue};
  queryLists: {key: number; value: Omit<QueryList, "id"> & {id?: number}; indexes: {syncId: string}};
  queries: {key: number; value: Omit<SavedQuery, "id"> & {id?: number}; indexes: {listId: number; syncId: string}};
  syncRecords: {key: string; value: SyncRecord};
  syncSettings: {key: string; value: SyncSettings};
}

const stores = ["gidSegments", "queryLists", "queries", "syncRecords", "syncSettings"] as const;
type WriteTransaction = IDBPTransaction<StudioDb, typeof stores, "readwrite">;

export class StaleRecordError extends Error {}

export function checkRevision(current: string | undefined, expected?: string | null) {
  if (expected !== undefined && current !== (expected ?? undefined)) throw new StaleRecordError();
}

export function openStudioDb(name: string) {
  return openDB<StudioDb>(name, 3, {
    upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) db.createObjectStore("gidSegments", {keyPath: "key"});
      if (oldVersion < 2) {
        db.createObjectStore("queryLists", {keyPath: "id", autoIncrement: true});
        db.createObjectStore("queries", {keyPath: "id", autoIncrement: true}).createIndex("listId", "listId");
      }
      db.createObjectStore("syncRecords", {keyPath: "path"});
      db.createObjectStore("syncSettings");
      tx.objectStore("queryLists").createIndex("syncId", "syncId", {unique: true});
      tx.objectStore("queries").createIndex("syncId", "syncId", {unique: true});
      void migrateRecords(tx).catch(() => {
        try { tx.abort(); } catch { /* IndexedDB already aborted the upgrade. */ }
      });
    },
    blocking(_currentVersion, _blockedVersion, event) {
      (event.target as IDBDatabase).close();
    },
  });
}

export const dbPromise = openStudioDb("noptis-studio");
type MigrationTransaction = IDBPTransaction<StudioDb, ArrayLike<(typeof stores)[number]>, "versionchange">;

type SyncRecordStore = {
  get(path: string): Promise<SyncRecord | undefined>;
  put(record: SyncRecord): Promise<string>;
};

export async function queueDocument(store: SyncRecordStore, desired: SyncDocument) {
  const path = documentPath(desired);
  await store.put({...await store.get(path), path, desired});
}

async function migrateRecords(tx: MigrationTransaction) {
  const numbers = tx.objectStore("gidSegments");
  const lists = tx.objectStore("queryLists");
  const queries = tx.objectStore("queries");
  const savedLists = await lists.getAll();
  const parents = new Map<number, {id: number; syncId: string}>();

  for (const builtIn of builtInLists) {
    const matching = savedLists.filter(list =>
      list.id === builtIn.id || list.title.trim().toUpperCase() === builtIn.title);
    const description = [
      ...matching.filter(list => list.id === builtIn.id),
      ...matching.filter(list => list.id !== builtIn.id),
    ].map(list => list.description).filter(Boolean).join("\n\n");
    const syncId = builtIn.title.toLowerCase();
    const doc = makeDocument("list", syncId, {title: builtIn.title, description});
    await lists.put({...builtIn, description, syncId, revision: doc.revision});
    if (description) await queueDocument(tx.objectStore("syncRecords"), doc);
    for (const list of matching) {
      parents.set(list.id!, {id: builtIn.id, syncId});
      if (list.id !== builtIn.id) await lists.delete(list.id!);
    }
    parents.set(builtIn.id, {id: builtIn.id, syncId});
  }

  for (const list of savedLists) {
    if (parents.has(list.id!) || isBuiltInListTitle(list.title)) continue;
    const syncId = crypto.randomUUID();
    const doc = makeDocument("list", syncId, {title: list.title, description: list.description});
    await lists.put({...list, syncId, revision: doc.revision});
    await queueDocument(tx.objectStore("syncRecords"), doc);
    parents.set(list.id!, {id: list.id!, syncId});
  }

  for (const query of await queries.getAll()) {
    const {title, description, sql, listId} = query;
    const parent = parents.get(listId);
    if (!parent) continue;
    const syncId = crypto.randomUUID();
    const doc = makeDocument("query", syncId, {title, description, sql, parent: parent.syncId});
    await queries.put({...query, listId: parent.id, syncId, revision: doc.revision});
    await queueDocument(tx.objectStore("syncRecords"), doc);
  }

  for (const record of await numbers.getAll()) {
    const doc = makeDocument("number", record.key, {value: record.value});
    await numbers.put({...record, revision: doc.revision});
    if (/^(GID|THM|CONTRACTOR)_\d+$/.test(record.key)) await queueDocument(tx.objectStore("syncRecords"), doc);
  }
}

export async function writeStudio<T>(write: (tx: WriteTransaction) => Promise<T>, notify = true) {
  const tx = (await dbPromise).transaction(stores, "readwrite");
  const done = tx.done;
  void done.catch(() => {});
  try {
    const result = await write(tx);
    await done;
    if (notify) notifyDbChange();
    return result;
  } catch (error) {
    try { tx.abort(); } catch { /* The failed request may already have aborted the transaction. */ }
    await done.catch(() => {});
    throw error;
  }
}

export async function saveGidSegment(key: string, value: string, expected?: string | null) {
  return writeStudio(async tx => {
    const store = tx.objectStore("gidSegments");
    checkRevision((await store.get(key))?.revision, expected);
    const doc = makeDocument("number", key, {value});
    const record = {key, value, updatedAt: new Date().toISOString(), revision: doc.revision};
    await store.put(record);
    await queueDocument(tx.objectStore("syncRecords"), doc);
    return record;
  });
}

export async function saveManagedGidSegment(key: string, value: string, originalKey?: string, expected?: string) {
  return writeStudio(async tx => {
    const store = tx.objectStore("gidSegments");
    if (originalKey) {
      const original = await store.get(originalKey);
      if (!original) throw new StaleRecordError();
      checkRevision(original.revision, expected);
    }
    const doc = makeDocument("number", key, {value});
    const record = {key, value, updatedAt: new Date().toISOString(), revision: doc.revision};
    if (originalKey === key) {
      await store.put(record);
    } else {
      await store.add(record);
      if (originalKey) {
        await store.delete(originalKey);
        await queueDocument(tx.objectStore("syncRecords"), makeDocument("number", originalKey, null));
      }
    }
    await queueDocument(tx.objectStore("syncRecords"), doc);
    return record;
  });
}

export async function getGidSegment(key: string) {
  return (await dbPromise).get("gidSegments", key);
}

export async function getAllGidSegments() {
  return (await dbPromise).getAll("gidSegments");
}

export async function deleteGidSegment(key: string, expected?: string) {
  await writeStudio(async tx => {
    const store = tx.objectStore("gidSegments");
    const record = await store.get(key);
    checkRevision(record?.revision, expected);
    if (!record) return;
    await store.delete(key);
    await queueDocument(tx.objectStore("syncRecords"), makeDocument("number", key, null));
  });
}

export async function getSyncSettings() {
  return (await dbPromise).get("syncSettings", "connection");
}

export async function setSyncSettings(settings: SyncSettings) {
  await writeStudio(async tx => {
    await tx.objectStore("syncSettings").put(settings, "connection");
  });
}
