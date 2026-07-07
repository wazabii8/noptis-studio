import { t } from "@/i18n/locale";
import { useLocale } from "@/i18n/LocaleContext";

export function useTranslation() {
  const { lang } = useLocale();

  return {
    t: (key: Parameters<typeof t>[1], fallback?: string) =>
      t(lang, key, fallback),
  };
}