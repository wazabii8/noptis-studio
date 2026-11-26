import {useEffect, useState, useSyncExternalStore} from "react";
import {useTranslation} from "@/i18n/useTranslation";
import {useLocale} from "@/i18n/LocaleContext";
import {useDbVersion} from "@/lib/dbChanges";
import {getSyncSettings} from "@/lib/localDb";
import type {SyncSettings} from "@/lib/localDb";
import {getQueryLists} from "@/lib/queries";
import type {QueryList} from "@/lib/queries";
import {readSyncRecords, recoverQuery, resolveConflict} from "@/lib/syncDatabase";
import {hasPending} from "@/lib/syncRecords";
import type {SyncDocument, SyncRecord} from "@/lib/syncRecords";
import {
  accountAddress, confirmSyncAccount, connectSync, disconnectSync,
  getSyncStatus, subscribeSyncStatus, syncNow,
} from "@/lib/synchronization";

const phases = {
  connecting: "syncConnecting", ready: "syncReady",
  syncing: "syncSyncing", offline: "syncOffline", error: "syncError", otherWindow: "syncOtherWindow",
} as const;
const recordLabels = {number: "syncNumberRecord", list: "syncListRecord", query: "syncQueryRecord"} as const;

function RecordVersion({document}: {document: SyncDocument}) {
  const {t} = useTranslation();
  const {data} = document;
  if (!data) return <p>{t("syncDeleted")}</p>;
  if ("value" in data) return <p className="whitespace-pre-wrap wrap-anywhere">{data.value}</p>;
  return (
    <>
      <p className="wrap-anywhere"><strong>{data.title}</strong></p>
      <p className="query-description whitespace-pre-wrap">{data.description}</p>
      {"sql" in data && <pre className="overflow-x-auto"><code>{data.sql}</code></pre>}
    </>
  );
}

function RecoverQuery({record, lists, busy, recover}: {
  record: SyncRecord; lists: QueryList[]; busy: boolean; recover: (id: number) => void;
}) {
  const {t} = useTranslation();
  const [target, setTarget] = useState<number>();
  const listId = lists.some(list => list.id === target) ? target : lists[0]?.id;
  return (
    <li className="query-row">
      <RecordVersion document={record.desired} />
      <div className="query-actions">
        <select aria-label={t("chooseList")} value={listId ?? ""} onChange={event => setTarget(Number(event.target.value))}>
          {lists.map(list => <option key={list.id} value={list.id}>{list.title}</option>)}
        </select>
        <button className="query-secondary" disabled={busy || listId === undefined}
                onClick={() => { if (listId !== undefined) recover(listId); }}>{t("syncRecover")}</button>
      </div>
    </li>
  );
}

export default function SyncSettingsPage() {
  const {t} = useTranslation();
  const {lang} = useLocale();
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus);
  const version = useDbVersion();
  const [settings, setSettings] = useState<SyncSettings>();
  const [records, setRecords] = useState<SyncRecord[]>([]);
  const [lists, setLists] = useState<QueryList[]>([]);
  const [input, setInput] = useState<string>();
  const [switchAccount, setSwitchAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const previousAddress = accountAddress(settings?.account);
  const address = input ?? previousAddress ?? "";
  const pending = records.filter(hasPending).length;
  const conflicts = records.filter(record => record.conflict);
  const recoverable = records.filter(record => record.deferred && !record.conflict);
  const connected = Boolean(settings?.enabled || status.canSwitch || status.issue === "syncAccountPending");
  const differentAccount = Boolean(previousAddress && address.trim() !== previousAddress);
  const showConnect = !connected || status.issue === "syncReconnect" || status.issue === "syncAuthDenied" ||
    status.issue === "syncAuthReturn" || status.issue === "syncDiscoveryFailed";
  const showSyncDetails = settings?.enabled && !showConnect && status.phase !== "connecting";
  const controlsDisabled = busy || status.phase === "connecting" || status.phase === "otherWindow";

  useEffect(() => {
    let canceled = false;
    Promise.all([getSyncSettings(), readSyncRecords(), getQueryLists()]).then(([settings, records, lists]) => {
      if (canceled) return;
      setSettings(settings);
      setRecords(records);
      setLists(lists);
    }).catch(() => { if (!canceled) setFailed(true); });
    return () => { canceled = true; };
  }, [status, version]);

  async function perform(action: () => Promise<unknown>) {
    setBusy(true);
    setFailed(false);
    try { await action(); }
    catch { setFailed(true); }
    finally { setBusy(false); }
  }

  return (
    <main className="queries-page wrapper max-w-2xl card">
      <header className="mb-8">
        <h1 className="headline-2 mb-3">{t("syncTitle")}</h1>
        <p>{t("syncIntro")}</p>
      </header>
      <section className="mb-8">
        {status.phase !== "off" && (
          <div role="status" className="mb-4">
            <p><strong>{t(phases[status.phase])}</strong>{status.address && <> · {status.address}</>}</p>
            {status.issue && <p>{t(status.issue)}</p>}
            {showSyncDetails && settings?.account && <p>{t("syncPending").replace("{count}", String(pending))}</p>}
            {showSyncDetails && settings?.lastSync && <p>{t("syncLast").replace("{time}", new Date(settings.lastSync).toLocaleString(lang))}</p>}
          </div>
        )}
        {showConnect && (
          <form className="query-form" onSubmit={event => {
            event.preventDefault();
            void perform(() => connectSync(address.trim(), differentAccount && switchAccount));
          }}>
            <label htmlFor="sync-address">{t("syncAddress")}</label>
            <input id="sync-address" value={address} placeholder="user@example.com" required
                   pattern={String.raw`[^@\s]+@[^@\s]+`} autoCapitalize="none" autoComplete="off" spellCheck={false}
                   disabled={controlsDisabled || connected} onChange={event => {
                     setInput(event.target.value);
                     setSwitchAccount(false);
                   }} />
            <a className="inline-block mt-1 text-sm underline" href="https://5apps.com/users/sign_up?site=storage">
              {t("syncSignUp")}
            </a>
            {differentAccount && !connected && (
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-auto" checked={switchAccount} disabled={controlsDisabled}
                       onChange={event => setSwitchAccount(event.target.checked)} />
                {t("syncSwitchAccount")}
              </label>
            )}
            <div className="query-actions">
              <button type="submit" className="query-primary" disabled={controlsDisabled || (differentAccount && !switchAccount)}>
                {t(previousAddress && !differentAccount ? "syncReconnectButton" : "syncConnect")}
              </button>
            </div>
          </form>
        )}
        {connected && (
          <div className="query-actions mt-3">
            {status.canSwitch && <button className="query-primary" disabled={controlsDisabled}
              onClick={() => void perform(confirmSyncAccount)}>{t("syncSwitchAccount")}</button>}
            {(status.phase === "ready" || status.phase === "syncing" || status.phase === "offline" ||
              (status.phase === "error" && status.address && ["syncFailed", "syncRemoteIncomplete"].includes(status.issue ?? ""))) &&
              <button className="query-primary" disabled={controlsDisabled || status.phase === "syncing"}
                      onClick={() => void perform(syncNow)}>{t("syncNow")}</button>}
            <button className="query-secondary" disabled={controlsDisabled}
                    onClick={() => void perform(async () => {
                      await disconnectSync();
                      setInput(undefined);
                      setSwitchAccount(false);
                    })}>{t("syncDisconnect")}</button>
          </div>
        )}
        {status.phase === "connecting" && (
          <button className="query-secondary mt-3" disabled={busy}
                  onClick={() => void perform(disconnectSync)}>{t("cancel")}</button>
        )}
        {failed && <p role="alert">{t("syncFailed")}</p>}
      </section>
      {conflicts.length > 0 && (
        <section className="mb-8">
          <h2 className="headline-4">{t("syncConflicts")}</h2>
          <p>{t("syncConflictIntro")}</p>
          <ul>
            {conflicts.map(record => (
              <li key={record.path} className="query-row">
                <p><strong>{t(recordLabels[record.desired.kind])}</strong>
                  {record.desired.kind === "number" && <> · {record.desired.id}</>}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0"><h3>{t("syncLocalVersion")}</h3><RecordVersion document={record.desired} /></div>
                  <div className="min-w-0"><h3>{t("syncRemoteVersion")}</h3><RecordVersion document={record.conflict!} /></div>
                </div>
                <div className="query-actions mt-3">
                  <button className="query-secondary" disabled={busy} onClick={() => void perform(() => resolveConflict(record, "local"))}>
                    {t("syncKeepLocal")}
                  </button>
                  <button className="query-secondary" disabled={busy} onClick={() => void perform(() => resolveConflict(record, "remote"))}>
                    {t("syncKeepRemote")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {recoverable.length > 0 && (
        <section>
          <h2 className="headline-4">{t("syncRecovery")}</h2>
          <p>{t("syncRecoveryIntro")}</p>
          <ul>
            {recoverable.map(record => <RecoverQuery key={record.path} record={record} lists={lists} busy={busy}
              recover={id => void perform(() => recoverQuery(record, id))} />)}
          </ul>
        </section>
      )}
    </main>
  );
}
