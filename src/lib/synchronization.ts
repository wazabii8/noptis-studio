import type RemoteStorage from "remotestoragejs";
import {subscribeDbChange} from "./dbChanges";
import {getSyncSettings, setSyncSettings} from "./localDb";
import {bindSyncAccount, markSynced, readSyncRecords} from "./syncDatabase";
import {createTransport, scope, SyncTransportError} from "./syncTransport";
import {hasPending, SyncIntegrityError} from "./syncRecords";
import type {TranslationKey} from "../i18n/locale";

const attemptKey = "noptis-studio:oauth";
const lockName = "noptis-studio:sync";
const settingsHash = "#sync";
type Attempt = {address: string; switchAccount: boolean; state: string; hash: string};
type SyncStatus = {
  phase: "off" | "connecting" | "ready" | "syncing" | "offline" | "error" | "otherWindow";
  address?: string;
  issue?: TranslationKey;
  canSwitch?: boolean;
};

const listeners = new Set<() => void>();
let status: SyncStatus = {phase: "off"};
let client: RemoteStorage | undefined;
let releaseLock: (() => void) | undefined;
let lockRequest: Promise<boolean> | undefined;
let initialization: Promise<RemoteStorage> | undefined;
let pendingAttempt: Attempt | undefined;
let activeAccount: string | undefined;
let awaitingSwitch: {key: string; address: string} | undefined;
let binding: Promise<void> | undefined;
let running: Promise<void> | undefined;
let retryTimer: number | undefined;
let retryAfter = 0;
let synchronize = createTransport();

export function getSyncStatus() {
  return status;
}

export function subscribeSyncStatus(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function setStatus(next: SyncStatus) {
  status = next;
  for (const listener of listeners) listener();
}

function restoreRoute(hash: string) {
  const url = new URL(import.meta.env.BASE_URL, location.origin);
  url.hash = hash;
  history.replaceState(history.state, "", url);
  dispatchEvent(new Event("hashchange"));
}

function finishAttempt() {
  const hash = pendingAttempt?.hash ?? settingsHash;
  pendingAttempt = undefined;
  sessionStorage.removeItem(attemptKey);
  restoreRoute(hash);
}

async function acquireLock(wait = false) {
  if (releaseLock) return true;
  if (lockRequest) return lockRequest;
  if (!navigator.locks) {
    setStatus({phase: "error", issue: "syncUnsupportedBrowser"});
    return false;
  }
  lockRequest = new Promise<boolean>(resolve => {
    void navigator.locks.request(lockName, {ifAvailable: !wait}, lock => {
      if (!lock) {
        resolve(false);
        return;
      }
      return new Promise<void>(release => {
        releaseLock = () => {
          releaseLock = undefined;
          lockRequest = undefined;
          release();
        };
        resolve(true);
      });
    }).catch(() => resolve(false));
  });
  const acquired = await lockRequest;
  if (!acquired) {
    lockRequest = undefined;
    setStatus({phase: "otherWindow"});
  }
  return acquired;
}

async function onConnected() {
  const remote = client?.remote;
  if (!remote?.connected || !remote.userAddress || !remote.href) return;
  const key = JSON.stringify([remote.userAddress, remote.href]);
  const attempt = pendingAttempt;
  const settings = await getSyncSettings();
  if (!attempt && (!settings?.enabled || settings.account !== key)) return;
  if (attempt && remote.userAddress !== attempt.address) {
    finishAttempt();
    setStatus({phase: "error", issue: "syncAuthReturn"});
    return;
  }
  if (!await bindSyncAccount(key, Boolean(attempt?.switchAccount))) {
    if (attempt) finishAttempt();
    awaitingSwitch = {key, address: remote.userAddress};
    const safe = !(await readSyncRecords()).some(record =>
      hasPending(record) || record.conflict || record.deferred);
    setStatus({
      phase: "error", address: remote.userAddress,
      issue: safe ? "syncConfirmAccount" : "syncAccountPending", canSwitch: safe,
    });
    return;
  }
  if (attempt) finishAttempt();
  activeAccount = key;
  retryAfter = 0;
  setStatus({phase: "ready", address: remote.userAddress});
  void syncNow();
}

function bindConnection() {
  binding ??= onConnected().finally(() => { binding = undefined; });
  return binding;
}

function initialize() {
  initialization ??= import("remotestoragejs").then(({default: RemoteStorage}) => {
    // IndexedDB is the durable application queue. Use the SDK's native
    // discovery, OAuth, network handling and revision-aware wire client.
    const sdk = new RemoteStorage({cache: false});
    client = sdk;
    sdk.access.claim(scope, "rw");
    const authorize = sdk.authorize.bind(sdk);
    sdk.authorize = options => {
      if (!pendingAttempt || pendingAttempt.address !== sdk.remote.userAddress) return;
      if (!options.authURL.startsWith("https://") || !sdk.remote.href?.startsWith("https://")) {
        finishAttempt();
        setStatus({phase: "error", issue: "syncDiscoveryFailed"});
        return;
      }
      authorize({...options, state: pendingAttempt.state});
    };
    sdk.on("connected", () => {
      void bindConnection().catch(() => setStatus({phase: "error", issue: "syncFailed"}));
    });
    sdk.on("error", (error: unknown) => {
      if (pendingAttempt) {
        finishAttempt();
        setStatus({phase: "error", issue: error instanceof RemoteStorage.Unauthorized ? "syncAuthDenied" : "syncDiscoveryFailed"});
      } else if (error instanceof RemoteStorage.Unauthorized && activeAccount) {
        activeAccount = undefined;
        window.clearTimeout(retryTimer);
        setStatus({phase: "error", address: sdk.remote.userAddress, issue: "syncReconnect"});
      }
    });
    return new Promise<RemoteStorage>(resolve => {
      // The SDK processes callback parameters during features-loaded.
      sdk.on("features-loaded", () => resolve(sdk));
    });
  }).catch(error => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}

function storedAttempt() {
  try {
    return JSON.parse(sessionStorage.getItem(attemptKey) ?? "null") as Attempt | null;
  } catch {
    return null;
  }
}

async function resumeConnection() {
  const settings = await getSyncSettings();
  if (!settings?.enabled) {
    releaseLock?.();
    setStatus({phase: "off"});
    return;
  }
  const sdk = await initialize();
  if (!sdk.remote.connected || settings.account !== JSON.stringify([sdk.remote.userAddress, sdk.remote.href])) {
    setStatus({phase: "error", address: accountAddress(settings?.account), issue: "syncReconnect"});
  }
}

export function accountAddress(account?: string): string | undefined {
  return account ? (JSON.parse(account) as [string, string])[0] : undefined;
}

export async function startSynchronization() {
  const url = new URL(location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const callbackKeys = ["access_token", "error", "code", "remotestorage"];
  const callback = callbackKeys.some(key => url.searchParams.has(key) || fragment.has(key));
  const attempt = storedAttempt();
  if (!callback) {
    if (attempt) {
      pendingAttempt = attempt;
      finishAttempt();
      setStatus({phase: "error", issue: "syncAuthDenied"});
    }
    if ((await getSyncSettings())?.enabled) {
      if (await acquireLock()) {
        await resumeConnection();
      } else if (navigator.locks) {
        void (async () => {
          if (await acquireLock(true)) await resumeConnection();
        })().catch(() => setStatus({phase: "error", issue: "syncFailed"}));
      }
    }
    return;
  }

  const returnedState = fragment.get("state") ?? url.searchParams.get("state");
  if (!attempt || attempt.state !== returnedState) {
    finishAttempt();
    setStatus({phase: "error", issue: "syncAuthReturn"});
    return;
  }
  pendingAttempt = attempt;
  if (fragment.has("error") || url.searchParams.has("error")) {
    finishAttempt();
    setStatus({phase: "error", issue: "syncAuthDenied"});
    return;
  }
  if (!fragment.has("access_token") || !await acquireLock()) {
    finishAttempt();
    setStatus({phase: "error", issue: "syncAuthReturn"});
    return;
  }
  setStatus({phase: "connecting", address: attempt.address});
  // State is already verified. Removing it keeps the SDK from treating it as
  // an app route. Preserve the rest of the callback until the SDK reads it.
  fragment.delete("state");
  url.searchParams.delete("state");
  url.hash = fragment.toString();
  history.replaceState(history.state, "", url);
  try {
    const sdk = await initialize();
    if (sdk.remote.connected) await bindConnection();
  } finally {
    if (pendingAttempt) {
      finishAttempt();
      setStatus({phase: "error", address: attempt.address, issue: "syncAuthReturn"});
    }
  }
}

export async function connectSync(address: string, switchAccount: boolean) {
  if (!await acquireLock()) return;
  const sdk = await initialize();
  const settings = await getSyncSettings();
  if (sdk.remote.connected && sdk.remote.userAddress !== address) {
    await disconnectSync();
    return connectSync(address, switchAccount);
  }
  activeAccount = undefined;
  window.clearTimeout(retryTimer);
  await running;
  const attempt = {address, switchAccount, hash: location.hash || settingsHash, state: crypto.randomUUID()};
  pendingAttempt = attempt;
  sessionStorage.setItem(attemptKey, JSON.stringify(attempt));
  setStatus({phase: "connecting", address});
  restoreRoute(attempt.hash);
  if (sdk.remote.userAddress === address && (sdk.remote.connected || settings?.enabled)) sdk.reconnect();
  else sdk.connect(address);
}

export async function confirmSyncAccount() {
  const account = awaitingSwitch;
  if (!account || !await bindSyncAccount(account.key, true)) {
    setStatus({...status, issue: "syncAccountPending", canSwitch: false});
    return;
  }
  awaitingSwitch = undefined;
  activeAccount = account.key;
  retryAfter = 0;
  synchronize = createTransport();
  setStatus({phase: "ready", address: account.address});
  await syncNow();
}

export async function disconnectSync() {
  if (!await acquireLock()) return;
  const sdk = await initialize();
  const settings = await getSyncSettings();
  activeAccount = undefined;
  awaitingSwitch = undefined;
  if (pendingAttempt) finishAttempt();
  window.clearTimeout(retryTimer);
  await setSyncSettings({...settings, enabled: false});
  // Clear credentials immediately. Any in-flight acknowledgement can be
  // recovered on the next connection from the durable staged revision.
  const disconnected = new Promise<void>(resolve => {
    function onDisconnected() {
      sdk.removeEventListener("disconnected", onDisconnected);
      resolve();
    }
    sdk.on("disconnected", onDisconnected);
  });
  sdk.disconnect();
  await Promise.all([disconnected, running]);
  synchronize = createTransport();
  releaseLock?.();
  setStatus({phase: "off"});
}

export function syncNow() {
  if (running) return running;
  const account = activeAccount;
  const sdk = client;
  if (!account || !sdk?.remote.connected) return Promise.resolve();
  const address = sdk.remote.userAddress;
  window.clearTimeout(retryTimer);
  if (!navigator.onLine) {
    setStatus({phase: "offline", address});
    return Promise.resolve();
  }
  const active = () => activeAccount === account && sdk.remote.connected && navigator.onLine;
  setStatus({phase: "syncing", address});

  running = (async () => {
    let delay: number;
    try {
      const complete = await synchronize(sdk.remote, account, active);
      if (!active()) return;
      if (complete) await markSynced(account);
      if (!active()) return;
      setStatus({phase: "ready", address});
      retryAfter = 0;
      delay = complete ? (document.hidden ? sdk.getBackgroundSyncInterval() : sdk.getSyncInterval()) : 1000;
    } catch (error) {
      if (!active()) return;
      const issue = error instanceof SyncTransportError ? error.reason
        : error instanceof SyncIntegrityError ? "syncRemoteIncomplete" : "syncFailed";
      if (issue === "syncReconnect") {
        activeAccount = undefined;
        setStatus({phase: "error", address, issue});
        return;
      }
      const offline = !navigator.onLine || !sdk.remote.online;
      setStatus({phase: offline ? "offline" : "error", address, issue: offline ? undefined : issue});
      delay = retryAfter ? Math.min(retryAfter * 2, 60000) : 5000;
      retryAfter = delay;
    }
    retryTimer = window.setTimeout(() => void syncNow(), delay);
  })().finally(() => { running = undefined; });

  return running;
}

window.addEventListener("online", () => {
  if (running) void running.then(syncNow);
  else void syncNow();
});
window.addEventListener("offline", () => {
  if (activeAccount && client) setStatus({phase: "offline", address: client.remote.userAddress});
});
window.addEventListener("pageshow", () => void syncNow());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void syncNow();
});
subscribeDbChange(() => {
  if (!activeAccount || running || retryAfter) return;
  window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => void syncNow(), 300);
});
