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

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const discovered = await discoverMixers();
      setMixers(discovered);
    } catch {
      setMixers([]);
      setError("Nao foi possivel buscar mixers automaticamente.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || autoLoadedRef.current) return;

    autoLoadedRef.current = true;
    void refresh();
  }, [enabled, refresh]);

  return {
    mixers,
    isLoading,
    error,
    refresh,
  };
}
