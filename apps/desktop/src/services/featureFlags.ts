import { createContext, useContext } from "react";

export const FeatureFlagsContext = createContext<Record<string, boolean>>({});

/** Returns true if the flag is explicitly enabled server-side. Unknown flags default to false. */
export function useFeatureFlag(key: string): boolean {
  const flags = useContext(FeatureFlagsContext);
  return flags[key] === true;
}
