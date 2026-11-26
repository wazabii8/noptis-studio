import {createGidTypes, createSegments, GID_LENGTH, type GidLayoutItem, type SavedNumberKind} from "@/segments/Segments";
import {t, type Locale} from "@/i18n/locale";

function hasDigitWidth(input: string, length: number) {
  return input.length === length && /^[0-9]+$/.test(input);
}

/** Splits the input into fields, retaining partial values for the inspector. */
export function getSegmentedResult(lang: Locale, layout: GidLayoutItem[], input: string) {
  const definitions = createSegments(lang);
  let start = 0;

  return layout.map(item => {
    const isPadding = typeof item !== "string";
    const definition = isPadding ? undefined : definitions[item];
    const expected = isPadding ? item.index : "0".repeat(definitions[item].length);
    const inpValue = input.slice(start, start + expected.length);
    start += expected.length;
    const isValid = isPadding ? inpValue === expected : hasDigitWidth(inpValue, expected.length);

    return {
      key: isPadding ? "PADDING" : item,
      value: isValid ? inpValue : expected,
      inpValue,
      label: definition?.label ?? t(lang, "padding"),
      description: definition?.description ?? t(lang, "paddingDesc"),
      isValid,
    };
  });
}

export type Segment = ReturnType<typeof getSegmentedResult>[number];

export function parseGid(lang: Locale, input: string) {
  const gidType = Object.values(createGidTypes(lang)).find(type => type.prefix === input.slice(0, 4));
  if (!gidType) return null;

  const segments = getSegmentedResult(lang, gidType.layout, input);
  const isValid = hasDigitWidth(input, GID_LENGTH) && segments.every(segment => segment.isValid)
    && segments.reduce((length, segment) => length + segment.inpValue.length, 0) === input.length;
  return {label: gidType.label, segments, isValid};
}

export function isValidSavedNumber(lang: Locale, kind: SavedNumberKind, input: string) {
  if (kind === "GID") return parseGid(lang, input)?.isValid ?? false;

  return hasDigitWidth(input, createSegments(lang)[kind].length);
}
