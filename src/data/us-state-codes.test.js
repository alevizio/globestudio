import { describe, expect, it } from "vitest";
import statesTopology from "us-atlas/states-10m.json";
import { US_STATE_FIPS } from "./us-state-codes.js";

// Postal code to name, to check each code lands on the state us-atlas names.
const NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  AS: "American Samoa", GU: "Guam", MP: "Commonwealth of the Northern Mariana Islands",
  PR: "Puerto Rico", VI: "United States Virgin Islands",
};

describe("US state codes", () => {
  const atlas = new Map(statesTopology.objects.states.geometries.map((state) => [String(state.id), state.properties.name]));

  it("cover every state, DC and territory the studio's State picker lists, by its us-atlas id", () => {
    expect(Object.values(US_STATE_FIPS).sort()).toEqual([...atlas.keys()].sort());
  });

  it("give each postal code the id of the state it names", () => {
    expect(Object.keys(US_STATE_FIPS).sort()).toEqual(Object.keys(NAMES).sort());
    for (const [code, id] of Object.entries(US_STATE_FIPS)) {
      expect(atlas.get(id), code).toBe(NAMES[code]);
    }
  });
});
