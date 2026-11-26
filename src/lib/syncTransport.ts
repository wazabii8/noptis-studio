import type RemoteStorage from "remotestoragejs";
import {acknowledgeUpload, applyRemoteDocuments, readSyncRecords, stageUpload} from "./syncDatabase";
import {hasPending, isRecordPath, parseDocument, recordOrder} from "./syncRecords";
import type {SyncDocument} from "./syncRecords";

export const scope = "noptis-studio";
const root = `/${scope}/`;
type Remote = RemoteStorage["remote"];
type RemoteRecord = {etag: string; document: SyncDocument};

export class SyncTransportError extends Error {
  readonly reason: "syncReconnect" | "syncRemoteIncomplete" | "syncUnsupported" | "syncFailed";

  constructor(reason: SyncTransportError["reason"]) {
    super(reason);
    this.reason = reason;
  }
}

function checkStatus(status: number, expected: number[]) {
  if (status === 401 || status === 403) throw new SyncTransportError("syncReconnect");
  if (!expected.includes(status)) throw new SyncTransportError("syncFailed");
}

export function createTransport() {
  let cache = new Map<string, RemoteRecord>();

  return async function synchronize(remote: Remote, account: string, active: () => boolean) {
    // The SDK's cached store can adopt a newer ETag between our read and write.
    // Its wire API lets us condition the write on the exact version we reconciled.
    if (!("supportsRevs" in remote) || !remote.supportsRevs) throw new SyncTransportError("syncUnsupported");
    const listing = await remote.get(root);
    checkStatus(listing.statusCode, [200, 404]);
    if (listing.statusCode === 200 && (!listing.body || typeof listing.body !== "object" || Array.isArray(listing.body))) {
      throw new SyncTransportError("syncRemoteIncomplete");
    }
    const records = new Map<string, RemoteRecord>();
    for (const [path, metadata] of Object.entries(listing.body ?? {})) {
      if (!isRecordPath(path)) continue;
      const cached = cache.get(path);
      if (cached?.etag && cached.etag === metadata?.ETag) {
        records.set(path, cached);
        continue;
      }
      const result = await remote.get(root + path);
      if (result.statusCode === 404) throw new SyncTransportError("syncRemoteIncomplete");
      checkStatus(result.statusCode, [200]);
      if (!result.revision) throw new SyncTransportError("syncUnsupported");
      try {
        records.set(path, {etag: result.revision, document: parseDocument(path, result.body)});
      } catch {
        throw new SyncTransportError("syncRemoteIncomplete");
      }
    }
    if ((await readSyncRecords()).some(record => record.base && !records.has(record.path))) {
      throw new SyncTransportError("syncRemoteIncomplete");
    }
    if (!active()) return false;

    cache = records;
    await applyRemoteDocuments(account, [...records.values()].map(item => item.document)
      .sort((a, b) => recordOrder.indexOf(a.kind) - recordOrder.indexOf(b.kind)));

    const candidates = (await readSyncRecords())
      .filter(record => hasPending(record) && !record.conflict && !record.deferred)
      .sort((a, b) => recordOrder.indexOf(a.desired.kind) - recordOrder.indexOf(b.desired.kind));
    for (const record of candidates) {
      const cloud = records.get(record.path);
      // A user may have resolved a conflict since the listing was read.
      if (cloud?.document.revision !== record.base?.revision) return false;
      if (!active()) return false;
      if (!await stageUpload(account, record)) continue;
      if (!active()) return false;
      const result = await remote.put(root + record.path, JSON.stringify(record.desired), "application/json",
        cloud ? {ifMatch: cloud.etag} : {ifNoneMatch: "*"});
      if (result.statusCode === 412) return false;
      checkStatus(result.statusCode, [200, 201, 204]);
      if (!active()) return false;
      // A successful conditional PUT acknowledges precisely this document. If we
      // exit before saving that acknowledgement, the next read recovers it.
      await acknowledgeUpload(account, record.desired);
      if (result.revision) cache.set(record.path, {etag: result.revision, document: record.desired});
    }
    return true;
  };
}
