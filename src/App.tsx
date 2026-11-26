import {useEffect, useState, useSyncExternalStore} from 'react'
import './App.css'
import {t} from './i18n/locale'
import {useLocale} from "@/i18n/LocaleContext";
import Modal from "@/components/ui/Modal.tsx";
import SegmentOverview from "@/components/segment/SegmentOverview.tsx";
import SavedNumbersPage from "@/components/segment/SavedNumbersPage.tsx";
import GidInspector from "@/components/segment/GidInspector";

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
      {savedNumbersOpen && <SavedNumbersPage onInspect={setValue} />}
      <Modal
        title={t(lang, 'gidLayouts')}
        description={t(lang, 'gidLayoutsIntro')}
        content={<SegmentOverview />}
        open={show}
        onClose={() => setShow(false)}
        wide
      />
      {!queriesOpen && !savedNumbersOpen && !syncOpen && (
        <GidInspector value={value} onChange={setValue} onOpenLayouts={openGidOverview} />
      )}
    </>
  )
}

export default App
