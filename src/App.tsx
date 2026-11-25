import {useMemo, useState, useSyncExternalStore} from 'react'
import './App.css'
import {createGidTypes} from "./segments/Segments.ts";
import * as Helpers from "./utils/Helpers.ts";
import SegmentTable from "@/components/segment/SegmentTable.tsx";
import {t} from './i18n/locale'
import {useLocale} from "@/i18n/LocaleContext";
import Modal from "@/components/ui/Modal.tsx";
import SegmentOverview from "@/components/segment/SegmentOverview.tsx";

import StudioHeader from "@/components/StudioHeader";
import QueriesPage from "@/components/queries/QueriesPage";

function subscribeToPageChange(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function isQueriesPage() {
  return window.location.hash === '#queries';
}

type Segment = {
  key: string;
  label: string;
  description: string;
  value: string;
  inpValue: string;
  isValid: boolean;
  isPadding: boolean;
};

function App() {

  const {lang} = useLocale();
  const [value, setValue] = useState('')
  const gidTypes = useMemo(() => createGidTypes(lang), [lang]);
  const queriesOpen = useSyncExternalStore(subscribeToPageChange, isQueriesPage);
  const [show, setShow] = useState(false);

  /**
   * Extracts the prefix, returns all GID type entries matching a given prefix,
   * and lastly, Splits an input GID string into segments based on a type layout.
   */
  const gidResult = useMemo(() => {
    const prefix = Helpers.getPrefixFromStr(value);
    const result = Helpers.getGidTypeFromPrefix(gidTypes, prefix);
    const type = Object.keys(result)[0] ?? false;

    if (!type) return null;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const gidType = result[type];
    const segmentedResult = Helpers.getSegmentedResult(lang, gidType.layout, value);

    return {gidType, segmentedResult};
  }, [value, gidTypes, lang]);

  const openGidOverview = () => {
    setShow(true);
  };

  return (
    <>
      <StudioHeader queriesOpen={queriesOpen} />
      {queriesOpen ? <QueriesPage /> : (
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
                  <h2 className={"headline-4 mb-2"}>{gidResult.gidType.label}</h2>
                  <SegmentTable title={t(lang, "GIDSegmentDetails")}
                                segments={gidResult.segmentedResult as Segment[]}></SegmentTable>
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
