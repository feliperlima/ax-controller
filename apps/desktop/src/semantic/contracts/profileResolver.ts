import type {
  SemanticProfileCapabilities,
  SemanticProtocolProfile,
} from "../types";

export interface SemanticProfileResolver {
  getActiveProfile(): SemanticProtocolProfile | null;
  isProfileReliable(): boolean;
  getCapabilities(
    profile?: SemanticProtocolProfile | null
  ): SemanticProfileCapabilities | null;
}
