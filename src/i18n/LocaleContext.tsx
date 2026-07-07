import {
  createContext,
  type ReactNode,
  useContext,
  useState,
} from "react";

import type { Locale } from "@/i18n/locale";

type LocaleContextValue = {
  lang: Locale;
  setLang: (lang: Locale) => void;
  toggleLang: () => void;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

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

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }

  return context;
}