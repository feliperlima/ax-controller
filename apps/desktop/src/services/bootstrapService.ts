export type BootstrapFeatureFlags = Record<string, boolean>;

export type BootstrapMessage = {
  key: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "error";
  channel: "banner" | "toast" | "modal";
};

export type BootstrapVersionInfo = {
  update_type: "none" | "optional" | "recommended" | "required";
  latest_version: string;
  download_url: string;
  message: string;
};

export type BootstrapResult = {
  feature_flags: BootstrapFeatureFlags;
  messages: BootstrapMessage[];
  version: BootstrapVersionInfo | null;
  public_key: string | null;
  server_time: string | null;
};

const BOOTSTRAP_DEFAULTS: BootstrapResult = {
  feature_flags: {},
  messages: [],
  version: null,
  public_key: null,
  server_time: null,
};

// Stub for Phase 0 — real implementation comes in Phase 2 with RemoteConfigProvider.
// Returns null when offline or on any error; callers must fall back to defaults.
export async function fetchBootstrap(): Promise<BootstrapResult | null> {
  void BOOTSTRAP_DEFAULTS;
  return null;
}
