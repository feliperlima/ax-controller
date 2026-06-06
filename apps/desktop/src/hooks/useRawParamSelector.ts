import { useEffect, useRef, useState } from "react";
import type { UniversalRawParamStore } from "../lib/universalRawParamStore";

export function useRawParamSelector<T>(
  store: UniversalRawParamStore | null | undefined,
  selector: (store: UniversalRawParamStore) => T,
  isEqual: (previous: T | null, next: T | null) => boolean = Object.is
): T | null {
  const selectorRef = useRef(selector);
  const isEqualRef = useRef(isEqual);

  selectorRef.current = selector;
  isEqualRef.current = isEqual;

  const [selected, setSelected] = useState<T | null>(() =>
    store ? selector(store) : null
  );

  useEffect(() => {
    if (!store) {
      setSelected(null);
      return;
    }

    setSelected((previous) => {
      const next = selectorRef.current(store);
      return isEqualRef.current(previous, next) ? previous : next;
    });

    return store.subscribe(() => {
      setSelected((previous) => {
        const next = selectorRef.current(store);
        return isEqualRef.current(previous, next) ? previous : next;
      });
    });
  }, [store]);

  return selected;
}
