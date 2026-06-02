export type RawParamProfileModel = "AX16" | "AX24" | "AX32" | "unknown";

export type RawParamSource =
  | "bootSync"
  | "runtime"
  | "userTxEcho"
  | "reconnect"
  | "unknown";

export type RawParamKnownStatus = "known" | "partiallyKnown" | "unknown";

export type RawParamEntry = {
  paramId: number;
  value: number;
  activeProfile: RawParamProfileModel;
  timestamp: number;
  source: RawParamSource;
  knownStatus: RawParamKnownStatus;
  lastSeenAtBoot?: number;
  lastSeenRuntime?: number;
  decodedEntity?: string;
  decodedProperty?: string;
};

export type RawParamStoreSnapshot = {
  version: number;
  totalParamsSeen: number;
  totalKnown: number;
  totalUnknown: number;
  totalPartiallyKnown: number;
  updatesInLastSecond: number;
  recentParams: RawParamEntry[];
  entries: RawParamEntry[];
};

const RECENT_PARAM_LIMIT = 60;
const UPS_WINDOW_MS = 1000;

export class UniversalRawParamStore {
  private entries = new Map<number, RawParamEntry>();
  private subscribers = new Set<() => void>();
  private recentParamIds: number[] = [];
  private updateTimestamps: number[] = [];
  private version = 0;

  subscribe(listener: () => void) {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  getVersion() {
    return this.version;
  }

  clear() {
    this.entries.clear();
    this.recentParamIds = [];
    this.updateTimestamps = [];
    this.version += 1;
    this.emit();
  }

  upsertRawParam(entry: RawParamEntry) {
    const now = entry.timestamp;
    const previous = this.entries.get(entry.paramId);

    const nextEntry: RawParamEntry = {
      ...previous,
      ...entry,
      lastSeenAtBoot:
        entry.source === "bootSync"
          ? now
          : entry.lastSeenAtBoot ?? previous?.lastSeenAtBoot,
      lastSeenRuntime:
        entry.source === "runtime" || entry.source === "reconnect"
          ? now
          : entry.lastSeenRuntime ?? previous?.lastSeenRuntime,
    };

    this.entries.set(entry.paramId, nextEntry);
    this.trackRecentParam(entry.paramId);
    this.trackUpdateTimestamp(now);
    this.version += 1;
    this.emit();
  }

  getRawParam(paramId: number) {
    return this.entries.get(paramId);
  }

  getAllRawParams() {
    return Array.from(this.entries.values());
  }

  getKnownParams() {
    return this.getAllRawParams().filter((entry) => entry.knownStatus === "known");
  }

  getUnknownParams() {
    return this.getAllRawParams().filter((entry) => entry.knownStatus === "unknown");
  }

  getParamsByProfile(profile: RawParamProfileModel) {
    return this.getAllRawParams().filter((entry) => entry.activeProfile === profile);
  }

  getRawParamStoreSnapshot(): RawParamStoreSnapshot {
    const entries = this.getAllRawParams();
    const totalKnown = entries.filter((entry) => entry.knownStatus === "known").length;
    const totalPartiallyKnown = entries.filter(
      (entry) => entry.knownStatus === "partiallyKnown"
    ).length;
    const totalUnknown = entries.filter((entry) => entry.knownStatus === "unknown").length;

    return {
      version: this.version,
      totalParamsSeen: entries.length,
      totalKnown,
      totalPartiallyKnown,
      totalUnknown,
      updatesInLastSecond: this.computeUpdatesInLastSecond(Date.now()),
      recentParams: this.recentParamIds
        .map((paramId) => this.entries.get(paramId))
        .filter((entry): entry is RawParamEntry => Boolean(entry)),
      entries,
    };
  }

  private emit() {
    this.subscribers.forEach((listener) => listener());
  }

  private trackRecentParam(paramId: number) {
    this.recentParamIds = this.recentParamIds.filter((id) => id !== paramId);
    this.recentParamIds.unshift(paramId);
    if (this.recentParamIds.length > RECENT_PARAM_LIMIT) {
      this.recentParamIds.length = RECENT_PARAM_LIMIT;
    }
  }

  private trackUpdateTimestamp(at: number) {
    this.updateTimestamps.push(at);
    this.trimOldTimestamps(at);
  }

  private trimOldTimestamps(now: number) {
    this.updateTimestamps = this.updateTimestamps.filter((at) => now - at <= UPS_WINDOW_MS);
  }

  private computeUpdatesInLastSecond(now: number) {
    this.trimOldTimestamps(now);
    return this.updateTimestamps.length;
  }
}
