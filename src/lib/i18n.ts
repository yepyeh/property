import enPo from "../locales/en.po?raw";
import filPo from "../locales/fil.po?raw";
import idPo from "../locales/id.po?raw";
import kmPo from "../locales/km.po?raw";
import loPo from "../locales/lo.po?raw";
import msPo from "../locales/ms.po?raw";
import myPo from "../locales/my.po?raw";
import thPo from "../locales/th.po?raw";
import viPo from "../locales/vi.po?raw";
import zhHansPo from "../locales/zh-Hans.po?raw";

export const LOCALE_COOKIE = "pa-locale";

export const SUPPORTED_LOCALES = [
  { code: "en", label: "English", nativeLabel: "English", countries: ["SG"] },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia", countries: ["ID"] },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt", countries: ["VN"] },
  { code: "th", label: "Thai", nativeLabel: "ไทย", countries: ["TH"] },
  { code: "fil", label: "Filipino", nativeLabel: "Filipino", countries: ["PH"] },
  { code: "ms", label: "Malay", nativeLabel: "Bahasa Melayu", countries: ["MY", "BN"] },
  { code: "my", label: "Burmese", nativeLabel: "မြန်မာ", countries: ["MM"] },
  { code: "km", label: "Khmer", nativeLabel: "ខ្មែរ", countries: ["KH"] },
  { code: "lo", label: "Lao", nativeLabel: "ລາວ", countries: ["LA"] },
  { code: "zh-Hans", label: "Chinese (Simplified)", nativeLabel: "简体中文", countries: [] },
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]["code"];

const LOCALE_SET = new Set<SupportedLocale>(SUPPORTED_LOCALES.map((locale) => locale.code));

const COUNTRY_LOCALE_MAP = new Map<string, SupportedLocale>(
  SUPPORTED_LOCALES.flatMap((locale) => locale.countries.map((country) => [country, locale.code] as const))
);

const PO_SOURCES: Record<SupportedLocale, string> = {
  en: enPo,
  id: idPo,
  vi: viPo,
  th: thPo,
  fil: filPo,
  ms: msPo,
  my: myPo,
  km: kmPo,
  lo: loPo,
  "zh-Hans": zhHansPo,
};

type TranslationMap = Record<string, string>;

function parsePo(raw: string): TranslationMap {
  const result: TranslationMap = {};
  const lines = raw.split("\n");
  let currentId = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("msgid ")) {
      currentId = JSON.parse(trimmed.slice(6));
      continue;
    }

    if (trimmed.startsWith("msgstr ") && currentId) {
      const value = JSON.parse(trimmed.slice(7));
      result[currentId] = value;
      currentId = "";
    }
  }

  return result;
}

const TRANSLATIONS: Record<SupportedLocale, TranslationMap> = Object.fromEntries(
  Object.entries(PO_SOURCES).map(([locale, raw]) => [locale, parsePo(raw)])
) as Record<SupportedLocale, TranslationMap>;

export function isSupportedLocale(value?: string | null): value is SupportedLocale {
  return Boolean(value && LOCALE_SET.has(value as SupportedLocale));
}

export function normalizeLocaleCandidate(value?: string | null): SupportedLocale | null {
  if (!value) return null;
  if (isSupportedLocale(value)) return value;

  const lowered = value.toLowerCase();
  if (lowered.startsWith("zh")) return "zh-Hans";

  const base = lowered.split("-")[0];
  if (isSupportedLocale(base)) return base;
  if (base === "tl") return "fil";
  if (base === "cn") return "zh-Hans";
  return null;
}

export function getSuggestedLocale(input: { country?: string | null; acceptLanguage?: string | null }) {
  const country = input.country?.toUpperCase();
  if (country && COUNTRY_LOCALE_MAP.has(country)) return COUNTRY_LOCALE_MAP.get(country) ?? "en";

  const header = input.acceptLanguage || "";
  const ranked = header.split(",").map((part) => part.split(";")[0]?.trim()).filter(Boolean);
  for (const candidate of ranked) {
    const normalized = normalizeLocaleCandidate(candidate);
    if (normalized && normalized !== "en") return normalized;
  }

  return "en" as SupportedLocale;
}

export function translate(locale: SupportedLocale, id: string) {
  return TRANSLATIONS[locale]?.[id] || TRANSLATIONS.en[id] || id;
}

export function buildTranslator(locale: SupportedLocale) {
  return (id: string) => translate(locale, id);
}

export function getLocaleMeta(locale: SupportedLocale) {
  return SUPPORTED_LOCALES.find((item) => item.code === locale) || SUPPORTED_LOCALES[0];
}

export function getLocaleOptions(currentLocale: SupportedLocale, suggestedLocale: SupportedLocale, currentPath: string, search: string) {
  const ordered = [...SUPPORTED_LOCALES].sort((a, b) => {
    if (a.code === currentLocale) return -2;
    if (b.code === currentLocale) return 2;
    if (a.code === "en") return -1;
    if (b.code === "en") return 1;
    if (a.code === suggestedLocale) return -1;
    if (b.code === suggestedLocale) return 1;
    return a.label.localeCompare(b.label);
  });

  return ordered.map((locale) => {
    const params = new URLSearchParams(search);
    params.set("lang", locale.code);
    return {
      ...locale,
      current: locale.code === currentLocale,
      suggested: locale.code === suggestedLocale && locale.code !== "en",
      href: `${currentPath}${params.toString() ? `?${params.toString()}` : ""}`,
    };
  });
}
