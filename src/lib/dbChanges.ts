import {useSyncExternalStore} from "react";

const channel = typeof window === "undefined" ? undefined : new BroadcastChannel("noptis-studio-db");
const listeners = new Set<() => void>();
let version = 0;

function dispatch() {
  version += 1;
  for (const listener of listeners) listener();
}

channel?.addEventListener("message", dispatch);

export function notifyDbChange() {
  dispatch();
  channel?.postMessage(null);
}

export function subscribeDbChange(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useDbVersion() {
  return useSyncExternalStore(subscribeDbChange, () => version);
}
