
export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) {
    return false;
  }

  return await navigator.storage.persist();
}

export async function isPersistentStorageEnabled() {
  if (!navigator.storage?.persisted) {
    return false;
  }

  return await navigator.storage.persisted();
}