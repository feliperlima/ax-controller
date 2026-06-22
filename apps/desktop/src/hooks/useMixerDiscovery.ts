import { useCallback, useEffect, useRef, useState } from "react";
import { discoverMixers, probeMixerReachable, readKnownMixers, type DiscoveredMixer, type KnownMixerEntry, type MixerStatus } from "../services/mixerDiscovery";

function mergeMixers(current: DiscoveredMixer[], incoming: DiscoveredMixer[]): DiscoveredMixer[] {
  const merged = new Map<string, DiscoveredMixer>();
  current.forEach((m) => merged.set(m.ip, m));
  incoming.forEach((m) => merged.set(m.ip, m));
  const next = Array.from(merged.values());
  if (next.length !== current.length) return next;
  const same = next.every((m, i) => {
    const prev = current[i];
    return (
      prev !== undefined && prev.ip === m.ip && prev.id === m.id && prev.name === m.name &&
      prev.model === m.model && prev.channels === m.channels && prev.status === m.status && prev.macAddress === m.macAddress
    );
  });
  return same ? current : next;
}

function knownEntryToDiscovered(entry: KnownMixerEntry): DiscoveredMixer {
  return {
    id: `cache:${entry.ip}`,
    name: entry.name ?? `AXIOS${entry.channelCount}`,
    ip: entry.ip,
    macAddress: entry.mac,
    model: `AXIOS${entry.channelCount}`,
    channels: entry.channelCount,
    status: "unknown",
    source: "finder",
  };
}

type UseMixerDiscoveryResult = {
  mixers: DiscoveredMixer[];
  knownMixers: DiscoveredMixer[];
  hasSearched: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: (fullScan?: boolean) => Promise<void>;
};

export function useMixerDiscovery(enabled: boolean): UseMixerDiscoveryResult {
  const [mixers, setMixers] = useState<DiscoveredMixer[]>([]);
  const [knownMixers] = useState<DiscoveredMixer[]>(() =>
    readKnownMixers().map(knownEntryToDiscovered)
  );
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoLoadedRef = useRef(false);
  const refreshInFlightRef = useRef(false);

  const refresh = useCallback(async (silent = false, fullScan = false) => {
    // Refreshes silenciosos (periódicos) não começam se outro já está rodando.
    // Refreshes manuais sempre executam, mesmo se um silencioso está em andamento.
    if (silent && refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const discovered = await discoverMixers(fullScan);
      // 1) Mesa NOVA aparece como "checking" (Verificando…). Mesa já conhecida mantém o
      //    status atual durante o re-probe — evita flicker do badge/botão a cada ciclo (3s).
      setMixers((current) => {
        const byIp = new Map(current.map((m) => [m.ip, m]));
        const pre = discovered.map((m) => {
          const prev = byIp.get(m.ip);
          return { ...m, status: (prev ? prev.status : "checking") as MixerStatus };
        });
        return mergeMixers(current, pre);
      });
      // 2) Probe de alcançabilidade (TCP em ip:8088) → Online/Offline (verdade fresca).
      //    Conectar fica habilitado só nas Online (mesas que de fato respondem).
      const probed = await Promise.all(
        discovered.map(async (m) => ({
          ...m,
          status: ((await probeMixerReachable(m.ip)) ? "online" : "offline") as MixerStatus,
        }))
      );
      setMixers((current) => mergeMixers(current, probed));
    } catch {
      if (!silent) {
        setError("Nao foi possivel buscar mixers automaticamente.");
      }
    } finally {
      refreshInFlightRef.current = false;
      if (!silent) {
        setIsLoading(false);
        setHasSearched(true);
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

  const manualRefresh = useCallback(
    (fullScan = false) => refresh(false, fullScan),
    [refresh]
  );

  return {
    mixers,
    knownMixers,
    hasSearched,
    isLoading,
    error,
    refresh: manualRefresh,
  };
}
