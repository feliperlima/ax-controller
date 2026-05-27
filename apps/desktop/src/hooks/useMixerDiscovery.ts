import { useCallback, useEffect, useRef, useState } from "react";
import { discoverMixers, type DiscoveredMixer } from "../services/mixerDiscovery";

type UseMixerDiscoveryResult = {
  mixers: DiscoveredMixer[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useMixerDiscovery(enabled: boolean): UseMixerDiscoveryResult {
  const [mixers, setMixers] = useState<DiscoveredMixer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoLoadedRef = useRef(false);
  const refreshInFlightRef = useRef(false);

  const refresh = useCallback(async (silent = false) => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const discovered = await discoverMixers();
      setMixers((current) => {
        const merged = new Map<string, DiscoveredMixer>();
        current.forEach((mixer) => merged.set(mixer.ip, mixer));
        discovered.forEach((mixer) => merged.set(mixer.ip, mixer));
        const next = Array.from(merged.values());

        if (next.length !== current.length) {
          return next;
        }

        const same = next.every((mixer, index) => {
          const prev = current[index];
          return (
            prev !== undefined &&
            prev.ip === mixer.ip &&
            prev.id === mixer.id &&
            prev.name === mixer.name &&
            prev.model === mixer.model &&
            prev.channels === mixer.channels &&
            prev.status === mixer.status &&
            prev.macAddress === mixer.macAddress
          );
        });

        return same ? current : next;
      });
    } catch {
      if (!silent) {
        setError("Nao foi possivel buscar mixers automaticamente.");
      }
    } finally {
      refreshInFlightRef.current = false;
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || autoLoadedRef.current) return;

    autoLoadedRef.current = true;
    void refresh(false);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setInterval(() => {
      void refresh(true);
    }, mixers.length > 0 ? 3000 : 1200);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, mixers.length, refresh]);

  useEffect(() => {
    if (!enabled) return;

    const onFocus = () => {
      void refresh(true);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [enabled, refresh]);

  return {
    mixers,
    isLoading,
    error,
    refresh,
  };
}
