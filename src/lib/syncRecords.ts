export type ListFields = {title: string; description: string};
export type QueryFields = ListFields & {sql: string};

type RecordData = {
  number: {value: string};
  list: ListFields;
  query: QueryFields & {parent: string};
};

export type RecordKind = keyof RecordData;
export type SyncDocument = {
  [Kind in RecordKind]: {
    schema: 1;
    kind: Kind;
    id: string;
    revision: string;
    data: RecordData[Kind] | null;
  }
}[RecordKind];

export type SyncRecord = {
  path: string;
  desired: SyncDocument;
  base?: SyncDocument;
  staged?: SyncDocument;
  conflict?: SyncDocument;
  deferred?: boolean;
};

export const builtInLists = [{id: -1, title: "DOI"}, {id: -2, title: "ROI"}] as const;
export const recordOrder: RecordKind[] = ["list", "number", "query"];

export function isBuiltInList(id: number) {
  return builtInLists.some(list => list.id === id);
}

export function isBuiltInListTitle(title: string) {
  return builtInLists.some(list => list.title === title.trim().toUpperCase());
}

export function makeDocument<Kind extends RecordKind>(kind: Kind, id: string, data: RecordData[Kind] | null) {
  return {schema: 1, kind, id, revision: crypto.randomUUID(), data} as Extract<SyncDocument, {kind: Kind}>;
}

export function documentPath({kind, id}: Pick<SyncDocument, "kind" | "id">) {
  return `${kind}-${id}.json`;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const numberKey = /^(GID|THM|CONTRACTOR)_\d+$/;
const listId = /^(doi|roi)$/;
const fileName = /^(list|query|number)-[A-Za-z0-9_-]+\.json$/;

export function isRecordPath(path: string) {
  return fileName.test(path);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFields(value: unknown): ListFields | undefined {
  if (isObject(value) && typeof value.title === "string" && typeof value.description === "string") {
    return {title: value.title, description: value.description};
  }
}

export function parseDocument(path: string, body: unknown): SyncDocument {
  if (typeof body === "string") body = JSON.parse(body);
  if (isObject(body) && body.schema === 1 && typeof body.id === "string" &&
      typeof body.revision === "string" && uuid.test(body.revision)) {
    const {id, revision, data, kind} = body;
    const header = {schema: 1 as const, id, revision};
    if (kind === "number" && numberKey.test(id) && path === documentPath({kind, id})) {
      if (data === null) return {...header, kind, data};
      if (isObject(data) && typeof data.value === "string") return {...header, kind, data: {value: data.value}};
    }
    if (kind === "list" && path === documentPath({kind, id})) {
      const fields = readFields(data);
      if (listId.test(id) && fields?.title === id.toUpperCase()) return {...header, kind, data: fields};
      if (uuid.test(id) && (data === null || (fields && !isBuiltInListTitle(fields.title)))) {
        return {...header, kind, data: fields ?? null};
      }
    }
    if (kind === "query" && uuid.test(id) && path === documentPath({kind, id})) {
      if (data === null) return {...header, kind, data};
      const fields = readFields(data);
      if (fields && isObject(data) && typeof data.sql === "string" && typeof data.parent === "string" &&
          (uuid.test(data.parent) || listId.test(data.parent))) {
        return {...header, kind, data: {...fields, sql: data.sql, parent: data.parent}};
      }
    }
  }
  throw new Error("Unsupported sync record");
}

export function sameData(first: SyncDocument, second: SyncDocument) {
  const left = first.data;
  const right = second.data;
  if (left === null || right === null) return left === right;
  if ("value" in left) return "value" in right && left.value === right.value;
  return "title" in right && left.title === right.title && left.description === right.description &&
    (!("sql" in left) || ("sql" in right && left.sql === right.sql && left.parent === right.parent));
}

export function hasPending(record: SyncRecord) {
  return record.desired.revision !== record.base?.revision || Boolean(record.staged);
}

export class SyncIntegrityError extends Error {}

export function reconcileRecord(record: SyncRecord, remote: SyncDocument): SyncRecord {
  const {desired, base, staged} = record;
  for (const known of [desired, base, staged, record.conflict]) {
    if (known?.revision === remote.revision && !sameData(known, remote)) throw new SyncIntegrityError();
  }

  if (staged && base?.revision === remote.revision && staged.revision !== desired.revision) return record;
  if (remote.revision === desired.revision || sameData(remote, desired)) {
    return {...record, desired: remote, base: remote, staged: undefined, conflict: undefined};
  }
  if (staged?.revision === remote.revision) {
    return {...record, base: remote, staged: undefined, conflict: undefined};
  }
  if (base?.revision === remote.revision) return {...record, conflict: undefined};

  if (!staged && (!hasPending(record) || (base && sameData(base, desired)))) {
    return {...record, desired: remote, base: remote, conflict: undefined};
  }

  return {...record, staged: undefined, conflict: remote};
}
