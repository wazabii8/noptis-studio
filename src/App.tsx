import {useEffect, useMemo, useState, useSyncExternalStore} from 'react'
import './App.css'
import {parseGid} from "./utils/Helpers.ts";
import SegmentTable from "@/components/segment/SegmentTable.tsx";
import {t} from './i18n/locale'
import {useLocale} from "@/i18n/LocaleContext";
import Modal from "@/components/ui/Modal.tsx";
import SegmentOverview from "@/components/segment/SegmentOverview.tsx";
import SavedNumbersPage from "@/components/segment/SavedNumbersPage.tsx";

import StudioHeader from "@/components/StudioHeader";
import SyncSettingsPage from "@/components/SyncSettingsPage";
import QueriesPage from "@/components/queries/QueriesPage";

function subscribeToPageChange(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function getPage() {
  return window.location.hash;
}

const savedNumbersHash = '#gid-saved';

function App() {

  const {lang} = useLocale();
  const [value, setValue] = useState(() => {
    const previousInput: unknown = window.history.state?.gidInspectorInput;
    return getPage() === savedNumbersHash && typeof previousInput === 'string' ? previousInput : '';
  });
  const page = useSyncExternalStore(subscribeToPageChange, getPage);
  const queriesOpen = page === '#queries';
  const syncOpen = page === '#sync';
  const savedNumbersOpen = page === savedNumbersHash;
  const [show, setShow] = useState(false);

  const gidResult = useMemo(() => parseGid(lang, value), [lang, value]);

  useEffect(() => {
    if (savedNumbersOpen && window.history.state?.gidInspectorInput !== value) {
      window.history.replaceState({...window.history.state, gidInspectorInput: value}, '');
    }
  }, [savedNumbersOpen, value]);

  const openGidOverview = () => {
    setShow(true);
  };

  return (
    <>
      <StudioHeader queriesOpen={queriesOpen} savedNumbersOpen={savedNumbersOpen} syncOpen={syncOpen} />
      {syncOpen && <SyncSettingsPage />}
      {queriesOpen && <QueriesPage />}
      {savedNumbersOpen && <SavedNumbersPage />}
      {!queriesOpen && !savedNumbersOpen && !syncOpen && (
        <main>
          <Modal
            title={"GID Segment Overview"}
            content={<SegmentOverview />}
            open={show}
            onClose={() => setShow(false)}
          />
          <div className="wrapper max-w-lg">
            <div className="card">

              <header className={"mb-8"}>
                <h1 className={"headline-2 mb-3"}>{t(lang, 'titleGiDInspector', 'GID Inspector')}</h1>
                <p>{t(lang, 'descGiDInspector', 'GID Inspector')}</p>
              </header>

              <div className="mb-6">
                <label htmlFor="inp-gid">GID</label>
                <input
                  id={"inp-gid"}
                  type="text"
                  placeholder={t(lang, "GIDPlaceholder", "Fill in GID number")}
                  onChange={(e) => setValue(e.target.value)}
                  value={value}
                />
              </div>

              {gidResult && (
                <div>
                  <h2 className={"headline-4 mb-2"}>{gidResult.label}</h2>
                  <SegmentTable gid={value} gidValid={gidResult.isValid} segments={gidResult.segments} />
                </div>
              )}
            </div>
          </div>
          <button className={"gid-segment-button"} onClick={openGidOverview}>
            <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" fill="none" viewBox="0 0 24 24"><path className={"path-grid"} fill="#A9113F" d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4M14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4M14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0M18 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4M20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/></svg>
          </button>
        </main>
      )}
    </>
  )
}

export default App
