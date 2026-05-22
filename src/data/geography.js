import countryData from "virtual:slim-countries";
import { UNSUPPORTED_DOTTED_MAP_CODES } from "../config/constants.js";

// Maps browser `navigator.language` 2-letter prefixes to the 3-letter ISO codes
// that the world-countries translations object uses. Add more here as priority
// locales expand in vite.config.js's I18N_LOCALES.
const LOCALE_PREFIX_TO_ISO3 = {
  es: "spa",
  fr: "fra",
  de: "deu",
  zh: "zho",
  ar: "ara",
  pt: "por",
};

const detectLocaleIso3 = () => {
  if (typeof window === "undefined") return null;
  // `?locale=fr` URL override — useful for users on a browser locale that
  // doesn't match their preferred display language, and for embed integrations
  // that want to pin a specific locale per host. Takes precedence over
  // navigator.language.
  try {
    const params = new URLSearchParams(window.location.search);
    const override = params.get("locale");
    if (override) {
      const overridePrefix = override.slice(0, 2).toLowerCase();
      if (LOCALE_PREFIX_TO_ISO3[overridePrefix]) return LOCALE_PREFIX_TO_ISO3[overridePrefix];
    }
  } catch (_) {
    /* malformed URL, fall through to navigator */
  }
  if (typeof navigator === "undefined") return null;
  const prefix = (navigator.language || "").slice(0, 2).toLowerCase();
  return LOCALE_PREFIX_TO_ISO3[prefix] || null;
};

const activeLocale = detectLocaleIso3();

// The world-countries `region` field uses the UN M49 5-region split, which
// lumps the entire western hemisphere into "Americas". That's not how most
// people think about continents — splitting on subregion gives us the
// conventional 6-continent model (we have no Antarctica since it's filtered
// out above). Central America + Caribbean roll up into North America by
// the standard geographic-continent convention.
const AMERICAS_SUBREGION_TO_CONTINENT = {
  "North America": "North America",
  "Central America": "North America",
  Caribbean: "North America",
  "South America": "South America",
};

const continentFor = (region, subregion) => {
  if (region === "Americas") return AMERICAS_SUBREGION_TO_CONTINENT[subregion] || "Americas";
  return region;
};

export const countries = countryData
  .filter(
    (country) =>
      country.cca3 &&
      country.region !== "Antarctic" &&
      !UNSUPPORTED_DOTTED_MAP_CODES.has(country.cca3),
  )
  .map((country) => {
    const english = country.name?.common || country.cca3;
    const localized = activeLocale ? country.translations?.[activeLocale] : null;
    // Display: native first, English in parens if they differ. Falls back to
    // English-only for users on en-* and for countries with no translation.
    const display = localized && localized !== english ? `${localized} (${english})` : english;
    // Search tokens: all known names for this country in any priority locale,
    // plus the English common name. Lower-cased ASCII-fold not done here
    // because <input> filter matches via plain substring — Unicode is fine.
    const searchTokens = [english.toLowerCase()];
    if (country.translations) {
      for (const value of Object.values(country.translations)) {
        if (value) searchTokens.push(value.toLowerCase());
      }
    }
    const region = country.region || "Other";
    const subregion = country.subregion || "";
    return {
      _id: country.cca3,
      _displayName: display,
      _region: region,
      _subregion: subregion,
      _continent: continentFor(region, subregion),
      _searchTokens: searchTokens,
    };
  })
  .sort((a, b) => a._displayName.localeCompare(b._displayName));

// Lookup from cca3 ("USA") → un-padded ccn3 numeric string ("840"). The
// world-atlas topology keys its feature ids by the un-padded numeric, so we
// normalize here once at import time and let the solid-texture renderer just
// do `cca3ToCcn3.get(code)` to figure out which atlas feature to keep.
export const cca3ToCcn3 = new Map(
  countryData
    .filter((country) => country.cca3 && country.ccn3)
    .map((country) => [country.cca3, String(parseInt(country.ccn3, 10))]),
);

const GROUP_LABELS = {
  continent: "Continent",
  subregion: "Subregion",
};

const buildGroupedOptions = (field, typeKey) => {
  const groups = new Map();
  countries.forEach((item) => {
    const value = item[field];
    if (!value || value === "Other") return;
    const list = groups.get(value) || [];
    list.push(item._id);
    groups.set(value, list);
  });

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, ids]) => ({
      value: `${typeKey}:${name}`,
      label: `${name} (${GROUP_LABELS[typeKey]})`,
      ids,
    }));
};

export const continentOptions = buildGroupedOptions("_continent", "continent");
export const subregionOptions = buildGroupedOptions("_subregion", "subregion");

export const areaOptions = [
  { value: "world", label: "World", ids: [] },
  ...countries.map((item) => ({
    value: `country:${item._id}`,
    label: item._displayName,
    // searchTokens is the SearchableSelect's secondary match surface — when
    // the user types "Espagne" or "Deutschland" it hits the localized name
    // even though the visible label is "Spain (España)" or similar.
    searchTokens: item._searchTokens,
    ids: [item._id],
  })),
  ...continentOptions,
  ...subregionOptions,
];

export const areaOptionByValue = new Map(areaOptions.map((option) => [option.value, option]));
