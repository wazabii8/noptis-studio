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
import {
  AlertIcon, ChevronDownIcon, CloudCheckIcon, CloudIcon, CodeIcon, HashIcon, ListIcon, LogOutIcon, SyncIcon,
} from "@/components/ui/Icons";

// Short label for the status pill. Offline and another-window phases also show their full sentence below it.
const phases = {
  connecting: "syncConnecting", ready: "syncReady",
  syncing: "syncSyncing", offline: "syncOfflineShort", error: "syncError", otherWindow: "syncOtherWindowShort",
} as const;
const phaseNotices = {offline: "syncOffline", otherWindow: "syncOtherWindow"} as const;
const phaseTones = {
  off: "neutral", connecting: "neutral", ready: "ok", syncing: "neutral",
  offline: "neutral", error: "bad", otherWindow: "neutral",
} as const;
const recordLabels = {number: "syncNumberRecord", list: "syncListRecord", query: "syncQueryRecord"} as const;

function RecordVersion({document}: {document: SyncDocument}) {
  const {t} = useTranslation();
  const {data} = document;
  if (!data) return <p>{t("syncDeleted")}</p>;
  if ("value" in data) return <p className="whitespace-pre-wrap wrap-anywhere">{data.value}</p>;
  return (
    <>
      <p className="sync-record-title">{data.title}</p>
      {data.description && <p className="sync-record-description">{data.description}</p>}
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
    <li className="sync-item">
      <RecordVersion document={record.desired} />
      <div className="sync-recover-controls">
        <div className="query-list-select">
          <select aria-label={t("chooseList")} value={listId ?? ""} onChange={event => setTarget(Number(event.target.value))}>
            {lists.map(list => <option key={list.id} value={list.id}>{list.title}</option>)}
          </select>
          <ChevronDownIcon />
        </div>
        <button type="button" className="btn btn-secondary btn-tall" disabled={busy || listId === undefined}
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

  const tone = phaseTones[status.phase];
  const notice = status.phase === "offline" || status.phase === "otherWindow" ? phaseNotices[status.phase] : undefined;
  const showSyncNow = status.phase === "ready" || status.phase === "syncing" || status.phase === "offline" ||
    (status.phase === "error" && Boolean(status.address) && ["syncFailed", "syncRemoteIncomplete"].includes(status.issue ?? ""));

  return (
    <main className="studio-page queries-page">
      <header className="studio-page-header">
        <h1>{t("syncTitle")}</h1>
        <p>{t("syncIntro")}</p>
      </header>

      <section className="studio-card" aria-labelledby="sync-account-heading">
        <div className="sync-account" role={status.phase !== "off" ? "status" : undefined}>
          <div className="sync-account-header">
            <span className={`sync-tile is-${tone}`} aria-hidden="true">
              {status.phase === "ready" ? <CloudCheckIcon /> : <CloudIcon />}
            </span>
            <div className="sync-account-text">
              <h2 id="sync-account-heading" className="studio-card-title">{t("syncStorageTitle")}</h2>
              {status.phase !== "off" && status.address
                ? <p className="sync-account-address">{status.address}</p>
                : <p className="sync-account-hint">{t("syncLocalOnly")}</p>}
            </div>
            <span className={`status-pill is-${tone}`}>
              <span className="sync-dot" aria-hidden="true" />
              {status.phase === "off" ? t("syncNotConnected") : t(phases[status.phase])}
            </span>
          </div>
          {(notice || status.issue) && (
            <div className={status.issue ? "sync-notice is-bad" : "sync-notice"}>
              <AlertIcon />
              <div>
                {notice && <p>{t(notice)}</p>}
                {status.issue && <p>{t(status.issue)}</p>}
              </div>
            </div>
          )}
          {showSyncDetails && settings?.account && (
            <dl className="sync-stats">
              <div className="sync-stat">
                <dt>{t("syncPendingLabel")}<span className="sr-only">: </span></dt>
                <dd>{pending}</dd>
              </div>
              {settings.lastSync && (
                <div className="sync-stat">
                  <dt>{t("syncLastLabel")}<span className="sr-only">: </span></dt>
                  <dd>{new Date(settings.lastSync).toLocaleString(lang)}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {showConnect && (
          <form className="sync-connect" onSubmit={event => {
            event.preventDefault();
            void perform(() => connectSync(address.trim(), differentAccount && switchAccount));
          }}>
            <label htmlFor="sync-address">{t("syncAddress")}</label>
            <div className="sync-connect-row">
              <input id="sync-address" value={address} placeholder="user@example.com" required
                     pattern={String.raw`[^@\s]+@[^@\s]+`} autoCapitalize="none" autoComplete="off" spellCheck={false}
                     disabled={controlsDisabled || connected} onChange={event => {
                       setInput(event.target.value);
                       setSwitchAccount(false);
                     }} />
              <button type="submit" className="btn btn-primary sync-connect-button"
                      disabled={controlsDisabled || (differentAccount && !switchAccount)}>
                {t(previousAddress && !differentAccount ? "syncReconnectButton" : "syncConnect")}
              </button>
            </div>
            {differentAccount && !connected && (
              <label className="sync-checkbox">
                <input type="checkbox" checked={switchAccount} disabled={controlsDisabled}
                       onChange={event => setSwitchAccount(event.target.checked)} />
                {t("syncSwitchAccount")}
              </label>
            )}
            <a className="text-link sync-sign-up" href="https://5apps.com/users/sign_up?site=storage">
              {t("syncSignUp")}
            </a>
          </form>
        )}

        {(connected || status.phase === "connecting") && (
          <div className="sync-actions">
            {connected && status.canSwitch && (
              <button type="button" className="btn btn-primary" disabled={controlsDisabled}
                      onClick={() => void perform(confirmSyncAccount)}>{t("syncSwitchAccount")}</button>
            )}
            {connected && showSyncNow && (
              <button type="button" className="btn btn-primary" disabled={controlsDisabled || status.phase === "syncing"}
                      onClick={() => void perform(syncNow)}>
                <SyncIcon />{t("syncNow")}
              </button>
            )}
            {connected && (
              <button type="button" className="btn btn-ghost form-actions-end" disabled={controlsDisabled}
                      onClick={() => void perform(async () => {
                        await disconnectSync();
                        setInput(undefined);
                        setSwitchAccount(false);
                      })}>
                <LogOutIcon />{t("syncDisconnect")}
              </button>
            )}
            {status.phase === "connecting" && (
              <button type="button" className="btn btn-secondary" disabled={busy}
                      onClick={() => void perform(disconnectSync)}>{t("cancel")}</button>
            )}
          </div>
        )}

        {failed && <p className="sync-notice is-bad" role="alert"><AlertIcon />{t("syncFailed")}</p>}

        {!connected && (
          <div className="sync-includes">
            <span className="sync-includes-label">{t("syncWhatSyncs")}</span>
            <span><HashIcon />{t("savedNumbersTitle")}</span>
            <span><ListIcon />{t("syncQueryLists")}</span>
            <span><CodeIcon />{t("syncSqlQueries")}</span>
          </div>
        )}
      </section>

      {conflicts.length > 0 && (
        <section className="studio-card sync-conflicts" aria-labelledby="sync-conflicts-heading">
          <div className="studio-card-header">
            <div className="studio-card-heading">
              <h2 id="sync-conflicts-heading" className="studio-card-title">{t("syncConflicts")}</h2>
              <span className="count-pill is-bad">{conflicts.length}</span>
              <p className="studio-card-description">{t("syncConflictIntro")}</p>
            </div>
          </div>
          <ul>
            {conflicts.map(record => (
              <li key={record.path} className="sync-item">
                <p className="sync-item-title">
                  <strong>{t(recordLabels[record.desired.kind])}</strong>
                  {record.desired.kind === "number" && <> · <span className="sync-item-id">{record.desired.id}</span></>}
                </p>
                <div className="sync-versions">
                  <div className="sync-version"><h3>{t("syncLocalVersion")}</h3><RecordVersion document={record.desired} /></div>
                  <div className="sync-version"><h3>{t("syncRemoteVersion")}</h3><RecordVersion document={record.conflict!} /></div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" disabled={busy}
                          onClick={() => void perform(() => resolveConflict(record, "local"))}>{t("syncKeepLocal")}</button>
                  <button type="button" className="btn btn-secondary" disabled={busy}
                          onClick={() => void perform(() => resolveConflict(record, "remote"))}>{t("syncKeepRemote")}</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recoverable.length > 0 && (
        <section className="studio-card" aria-labelledby="sync-recovery-heading">
          <div className="studio-card-header">
            <div className="studio-card-heading">
              <h2 id="sync-recovery-heading" className="studio-card-title">{t("syncRecovery")}</h2>
              <span className="count-pill">{recoverable.length}</span>
              <p className="studio-card-description">{t("syncRecoveryIntro")}</p>
            </div>
          </div>
          <ul>
            {recoverable.map(record => <RecoverQuery key={record.path} record={record} lists={lists} busy={busy}
              recover={id => void perform(() => recoverQuery(record, id))} />)}
          </ul>
        </section>
      )}
    </main>
  );
}
