import { useEffect } from "react";
import { US_COUNTRY_ID } from "../config/constants.js";
import { loadUsStates } from "../data/us-states.js";

// Loads the US states atlas on demand and surfaces it through setUsStates.
// Only fires when the current selection is country:USA and the atlas
// hasn't been loaded yet — keeps the 110kB+ atlas chunk out of the
// initial bundle for anyone who never picks the US.
export const useUsStatesLoader = (selection, usStatesLength, setUsStates) => {
  useEffect(() => {
    const selectedCountryId = selection.startsWith("country:")
      ? selection.replace("country:", "")
      : "";
    if (selectedCountryId !== US_COUNTRY_ID || usStatesLength > 0) {
      return undefined;
    }

    let cancelled = false;
    loadUsStates().then((states) => {
      if (!cancelled) setUsStates(states);
    });
    return () => {
      cancelled = true;
    };
  }, [selection, usStatesLength, setUsStates]);
};
