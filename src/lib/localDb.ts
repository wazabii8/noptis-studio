import { openDB } from "idb";

const DB_NAME = "noptis-studio";
const DB_VERSION = 1;

export type GidSegmentValue = {
  key: string;
  value: string;
  updatedAt: string;
};

export const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("gidSegments")) {
      db.createObjectStore("gidSegments", {
        keyPath: "key",
      });
    }
  },
});

export async function saveGidSegment(key: string, value: string) {
  const db = await dbPromise;

  await db.put("gidSegments", {
    key,
    value,
    updatedAt: new Date().toISOString(),
  });
}

export async function getGidSegment(key: string) {
  const db = await dbPromise;
  return db.get("gidSegments", key) as Promise<GidSegmentValue | undefined>;
}

export async function getAllGidSegments() {
  const db = await dbPromise;
  return db.getAll("gidSegments") as Promise<GidSegmentValue[]>;
}

export async function deleteGidSegment(key: string) {
  const db = await dbPromise;
  await db.delete("gidSegments", key);
}