import en from "./locales/en.json";
import sv from "./locales/sv.json";

// Add "as const" to make it read only!
const locales = {en, sv} as const;

export type Locale = keyof typeof locales;
export type TranslationKey = keyof typeof en;

export const t = (
  locale: Locale,
  key: TranslationKey,
  fallback?: string
) => locales[locale][key] ?? locales.en[key] ?? fallback ?? key;
