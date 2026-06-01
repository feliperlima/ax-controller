export type SemanticProtocolProfile = "ax16_24" | "ax32" | "ax32_experimental";

export interface SemanticProfileCapabilities {
  channelCount: number;
  auxCount: number;
  fxCount: number;
  dcaCount?: number;
  muteGroupCount?: number;
}

export interface SemanticCommandContext {
  activeProfile: SemanticProtocolProfile | null;
  profileReliable: boolean;
  capabilities?: SemanticProfileCapabilities;
  requestId?: string;
  issuedAt: number;
}
