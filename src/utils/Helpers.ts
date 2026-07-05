import {createSegments} from "@/segments/Segments";
import { t, type Locale } from "@/i18n/locale";

type LayoutItem = string | { index: string };

/**
 * Extracts the prefix (first 4 characters) from an input string.
 * No validation of input format or length is performed.
 *
 * @param {string} input Raw GID string.
 * @returns {string} Extracted prefix.
 */
export function getPrefixFromStr(input: string): string {
  return input.substring(0, 4);
}

/**
 * Returns all GID type entries matching a given prefix.
 * If no match is found, an empty object is returned.
 *
 * @param {object} GidTypes Registry of available GID types.
 * @param {string} prefix Prefix to match.
 * @returns {object} Filtered GID types keyed as in the source object.
 */
export function getGidTypeFromPrefix(GidTypes: object, prefix: string): object {
  return Object.fromEntries(
    Object.entries(GidTypes).filter(([, value]) => value.prefix === prefix)
  );
}


/**
 * Index checker
 * @param x
 */
const hasIndex = (x: LayoutItem): x is { index: string } => {
  return typeof x === "object" && x !== null && "index" in x;
}


/**
 * Splits an input GID string into segments based on a type layout.
 *
 * @param lang
 * @param {string[]} gidTypeLayout GID type definition containing a layout array.
 * @param {string} input Raw GID string.
 * @returns {Array<{key: string, value: string, label: string}>} Ordered segment extraction result.
 */
export function getSegmentedResult(lang: Locale, gidTypeLayout: string[], input: string): object
{
  const result = [];
  let start = 0;
  for (const layout of gidTypeLayout) {
    const segments = createSegments(lang)
    const row = segments[layout as keyof typeof segments];

    const isPadding = hasIndex(layout);
    const length = isPadding ? layout.index.length : row.length;
    const inpValue = input.substring(start, start + length);
    const isValid = isPadding ? (layout.index === inpValue) : (row.length === inpValue.length);

    result.push({
      key: layout,
      value: isPadding ? layout.index : (isValid ? inpValue : "0".repeat(row.length)),
      inpValue: inpValue,
      label: row?.label ?? "Padding",
      isValid: isValid,
      isPadding: isPadding,
      description: row?.description ?? t(lang, "paddingDesc"),
    });

    start += length
  }
  return result;
}
