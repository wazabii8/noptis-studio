import {createContext, useContext} from "react";
import type { Locale } from "@/i18n/locale";

type LocaleContextValue = {
  lang: Locale;
  setLang: (lang: Locale) => void;
  toggleLang: () => void;
};

export const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }

  return context;
}
