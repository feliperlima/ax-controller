import { useEffect, useRef, useState } from "react";
import type { UniversalRawParamStore } from "../lib/universalRawParamStore";

export function useRawParamSelector<T>(
  store: UniversalRawParamStore,
  selector: (store: UniversalRawParamStore) => T,
  isEqual: (previous: T, next: T) => boolean = Object.is
) {
  const selectorRef = useRef(selector);
  const isEqualRef = useRef(isEqual);

  selectorRef.current = selector;
  isEqualRef.current = isEqual;

  const [selected, setSelected] = useState<T>(() => selector(store));

  useEffect(() => {
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
