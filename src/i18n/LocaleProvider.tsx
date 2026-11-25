import {type ReactNode, useState} from "react";
import {LocaleContext} from "./LocaleContext";
import type {Locale} from "./locale";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Locale>("en");

  const toggleLang = () => {
    setLang((current) => (current === "en" ? "sv" : "en"));
  };

  return (
    <LocaleContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </LocaleContext.Provider>
  );
}
