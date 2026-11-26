import {dbPromise, StaleRecordError, writeStudio} from "./localDb";
import {notifyDbChange} from "./dbChanges";
import {builtInLists, documentPath, hasPending, makeDocument, reconcileRecord} from "./syncRecords";
import type {SyncDocument, SyncRecord} from "./syncRecords";

type Transaction = Parameters<Parameters<typeof writeStudio>[0]>[0];

export async function readSyncRecords() {
  return (await dbPromise).getAll("syncRecords");
}

async function project(tx: Transaction, record: SyncRecord) {
  const {desired: doc} = record;
  if (doc.kind === "number") {
    const store = tx.objectStore("gidSegments");
    const existing = await store.get(doc.id);
    if (doc.data && existing?.value !== doc.data.value) {
      await store.put({key: doc.id, value: doc.data.value, updatedAt: new Date().toISOString(), revision: doc.revision});
      return true;
    }
    if (!doc.data && existing) {
      await store.delete(doc.id);
      return true;
    }
    return false;
  }

  if (doc.kind === "list") {
    const store = tx.objectStore("queryLists");
    const existing = await store.index("syncId").get(doc.id);
    if (doc.data && (existing?.title !== doc.data.title || existing?.description !== doc.data.description)) {
      const id = existing?.id ?? builtInLists.find(list => list.title.toLowerCase() === doc.id)?.id;
      await store.put({...doc.data, ...(id === undefined ? {} : {id}), syncId: doc.id, revision: doc.revision});
      return true;
    }
    if (!doc.data && existing?.id !== undefined) {
      await store.delete(existing.id);
      return true;
    }
    return false;
  }

  const store = tx.objectStore("queries");
  const existing = await store.index("syncId").get(doc.id);
  const parentId = doc.data && await tx.objectStore("queryLists").index("syncId").getKey(doc.data.parent);
  const deferred = Boolean(doc.data && parentId === undefined);
  if (Boolean(record.deferred) !== deferred) {
    await tx.objectStore("syncRecords").put({...record, deferred});
  }
  if (!doc.data || typeof parentId !== "number") {
    if (existing?.id === undefined) return false;
    await store.delete(existing.id);
    return true;
  }

  const {title, description, sql} = doc.data;
  if (existing?.title === title && existing.description === description &&
      existing.sql === sql && existing.listId === parentId) return false;
  await store.put({
    ...(existing?.id === undefined ? {} : {id: existing.id}),
    title, description, sql, listId: parentId, syncId: doc.id, revision: doc.revision,
  });
  return true;
}

async function projectQueries(tx: Transaction) {
  let changed = false;
  for (const record of await tx.objectStore("syncRecords").getAll()) {
    if (record.desired.kind === "query" && await project(tx, record)) changed = true;
  }
  return changed;
}

export async function applyRemoteDocuments(account: string, documents: SyncDocument[]) {
  const changed = await writeStudio(async tx => {
    const settings = await tx.objectStore("syncSettings").get("connection");
    if (!settings?.enabled || settings.account !== account) throw new Error("Connection changed");
    const store = tx.objectStore("syncRecords");
    let changed = false;
    for (const remote of documents) {
      const path = documentPath(remote);
      const previous = await store.get(path);
      const record = previous
        ? reconcileRecord(previous, remote)
        : {path, desired: remote, base: remote};
      if (!previous || previous.desired !== record.desired || previous.conflict !== record.conflict ||
          previous.base !== record.base || previous.staged !== record.staged) {
        await store.put(record);
      }
      if (remote.kind !== "query" && await project(tx, record)) changed = true;
    }
    return await projectQueries(tx) || changed;
  }, false);
  if (changed) notifyDbChange();
}

export async function stageUpload(account: string, candidate: SyncRecord) {
  return writeStudio(async tx => {
    const settings = await tx.objectStore("syncSettings").get("connection");
    if (!settings?.enabled || settings.account !== account) return false;
    const store = tx.objectStore("syncRecords");
    const current = await store.get(candidate.path);
    if (!current || current.conflict || current.desired.revision !== candidate.desired.revision ||
        current.base?.revision !== candidate.base?.revision) return false;
    await store.put({...current, staged: candidate.desired});
    return true;
  }, false);
}

export async function acknowledgeUpload(account: string, uploaded: SyncDocument) {
  await writeStudio(async tx => {
    const settings = await tx.objectStore("syncSettings").get("connection");
    if (!settings?.enabled || settings.account !== account) return;
    const store = tx.objectStore("syncRecords");
    const record = await store.get(documentPath(uploaded));
    if (record?.staged?.revision === uploaded.revision) {
      await store.put({...record, base: uploaded, staged: undefined});
    }
  }, false);
}

export async function resolveConflict(snapshot: SyncRecord, choice: "local" | "remote") {
  await writeStudio(async tx => {
    const store = tx.objectStore("syncRecords");
    const record = await store.get(snapshot.path);
    if (!record?.conflict || record.conflict.revision !== snapshot.conflict?.revision ||
        record.desired.revision !== snapshot.desired.revision) throw new StaleRecordError();
    const desired = choice === "local" ? record.desired : record.conflict;
    const resolved = {...record, desired, base: record.conflict, conflict: undefined, staged: undefined};
    await store.put(resolved);
    await project(tx, resolved);
    if (desired.kind === "list") await projectQueries(tx);
  });
}

export async function recoverQuery(snapshot: SyncRecord, listId: number) {
  await writeStudio(async tx => {
    const store = tx.objectStore("syncRecords");
    const record = await store.get(snapshot.path);
    const list = await tx.objectStore("queryLists").get(listId);
    if (!list || !record?.deferred || record.conflict || record.desired.revision !== snapshot.desired.revision ||
        record.desired.kind !== "query" || !record.desired.data) throw new StaleRecordError();
    const desired = makeDocument("query", record.desired.id, {...record.desired.data, parent: list.syncId});
    const moved = {...record, desired};
    await store.put(moved);
    await project(tx, moved);
  });
}

export async function bindSyncAccount(account: string, allowSwitch: boolean) {
  return writeStudio(async tx => {
    const settingsStore = tx.objectStore("syncSettings");
    const stored = await settingsStore.get("connection");
    if (stored?.account && stored.account !== account) {
      const store = tx.objectStore("syncRecords");
      const records = await store.getAll();
      if (!allowSwitch || records.some(record => hasPending(record) || record.conflict || record.deferred)) {
        return false;
      }
      for (const record of records) {
        if (record.desired.data === null) await store.delete(record.path);
        else await store.put({path: record.path, desired: record.desired});
      }
    }
    await settingsStore.put({
      account, enabled: true, lastSync: stored?.account === account ? stored.lastSync : undefined,
    }, "connection");
    return true;
  });
}

export async function markSynced(account: string) {
  await writeStudio(async tx => {
    const store = tx.objectStore("syncSettings");
    const settings = await store.get("connection");
    if (settings?.enabled && settings.account === account) {
      await store.put({...settings, lastSync: new Date().toISOString()}, "connection");
    }
  }, false);
}
