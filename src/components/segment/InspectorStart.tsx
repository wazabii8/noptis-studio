import {useEffect, useState} from "react";
import {useDbVersion} from "@/lib/dbChanges";
import {useLocale} from "@/i18n/LocaleContext";
import {useTranslation} from "@/i18n/useTranslation";
import {getAllGidSegments, type GidSegmentValue} from "@/lib/localDb";
import {getSegmentColor} from "@/segments/Segments";
import {parseGid} from "@/utils/Helpers";
import {ArrowRightIcon} from "@/components/ui/Icons";

const EXAMPLE_GIDS = ["9031123123412345", "9010123000000000"];
const MAX_SAVED_SHOWN = 5;

/** A GID with each segment underlined in its segment colour. */
function ColoredGid({gid}: {gid: string}) {
  const {lang} = useLocale();
  const result = parseGid(lang, gid);

  if (!result) return <span className="pick-number">{gid}</span>;

  return (
    <span className="pick-number">
      {result.segments.map((segment, index) => (
        <span key={index} style={{borderColor: getSegmentColor(segment.key)}}>{segment.inpValue}</span>
      ))}
    </span>
  );
}

/** Shown while the GID input is empty: saved GIDs and examples that fill the input in one click. */
export default function InspectorStart({onPick}: {onPick: (gid: string) => void}) {
  const {t} = useTranslation();
  const {lang} = useLocale();
  const dbVersion = useDbVersion();
  const [savedGids, setSavedGids] = useState<GidSegmentValue[]>([]);

  useEffect(() => {
    let active = true;
    getAllGidSegments().then(records => {
      if (!active) return;
      setSavedGids(records.filter(record => record.key.startsWith("GID_"))
        .sort((first, second) => first.key.localeCompare(second.key)));
    }).catch(() => {
      // The start screen still offers examples when saved numbers cannot be read.
    });
    return () => { active = false; };
  }, [dbVersion]);

  return (
    <>
      {savedGids.length > 0 && (
        <section className="studio-card" aria-labelledby="saved-gids-heading">
          <div className="studio-card-header">
            <div className="studio-card-heading">
              <h2 id="saved-gids-heading" className="studio-card-title">{t("yourSavedGids")}</h2>
              <span className="count-pill">{savedGids.length}</span>
            </div>
            <a className="text-link" href="#gid-saved">{t("manageSavedNumbers")}</a>
          </div>
          <ul>
            {savedGids.slice(0, MAX_SAVED_SHOWN).map(record => {
              const gid = record.key.slice("GID_".length);
              const typeLabel = parseGid(lang, gid)?.label;
              const details = [typeLabel, record.value].filter(Boolean).join(" · ");

              return (
                <li key={record.key}>
                  <button type="button" className="pick-row" onClick={() => onPick(gid)}>
                    <span className="min-w-0">
                      <ColoredGid gid={gid} />
                      {details && <span className="pick-details">{details}</span>}
                    </span>
                    <span className="pick-go">{t("inspect")}<ArrowRightIcon /></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="studio-card studio-card-dashed" aria-labelledby="examples-heading">
        <div className="studio-card-header">
          <h2 id="examples-heading" className="studio-card-title">{t("tryExample")}</h2>
        </div>
        <div className="example-list">
          {EXAMPLE_GIDS.map(gid => (
            <button key={gid} type="button" className="btn btn-secondary btn-tall" onClick={() => onPick(gid)}>
              <span className="example-gid">{gid}</span>
              <span className="example-type">{parseGid(lang, gid)?.label}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
