import countryData from "virtual:slim-countries";
import { UNSUPPORTED_DOTTED_MAP_CODES } from "../config/constants.js";

export const countries = countryData
  .filter(
    (country) =>
      country.cca3 &&
      country.region !== "Antarctic" &&
      !UNSUPPORTED_DOTTED_MAP_CODES.has(country.cca3),
  )
  .map((country) => ({
    _id: country.cca3,
    _displayName: country.name?.common || country.cca3,
    _region: country.region || "Other",
    _subregion: country.subregion || "",
  }))
  .sort((a, b) => a._displayName.localeCompare(b._displayName));

const buildGroupedOptions = (field, typeLabel) => {
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
      value: `${typeLabel}:${name}`,
      label: `${name} (${typeLabel === "region" ? "Region" : "Subregion"})`,
      ids,
    }));
};

export const regionOptions = buildGroupedOptions("_region", "region");
export const subregionOptions = buildGroupedOptions("_subregion", "subregion");

export const areaOptions = [
  { value: "world", label: "World", ids: [] },
  ...countries.map((item) => ({
    value: `country:${item._id}`,
    label: item._displayName,
    ids: [item._id],
  })),
  ...regionOptions,
  ...subregionOptions,
];

export const areaOptionByValue = new Map(areaOptions.map((option) => [option.value, option]));
