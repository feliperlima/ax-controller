import type { SemanticCommandContext, SemanticProtocolProfile } from "../types";
import type { MixerModel } from "../../protocol/duonn/protocolAddressing";
import { SemanticResolverError } from "../errors";

export function profileToMixerModel(
  profile: SemanticProtocolProfile,
  channelCount: number
): MixerModel {
  if (profile === "ax32" || profile === "ax32_experimental") return "AX32";
  return channelCount <= 16 ? "AX16" : "AX24";
}

export function requireReliableProfile(context: SemanticCommandContext, commandName: string): void {
  if (!context.activeProfile || !context.profileReliable) {
    throw new SemanticResolverError(
      `Semantic ${commandName} requires a reliable active profile.`,
      "SEMANTIC_PROFILE_NOT_RELIABLE"
    );
  }
}

export function requireAddress(path: string, match: RegExpMatchArray | null, commandName: string): void {
  if (!match) {
    throw new SemanticResolverError(
      `Invalid semantic address for ${commandName}: ${path}`,
      "SEMANTIC_INVALID_ADDRESS"
    );
  }
}

export function faderDbToRawValue(db: number): number {
  const clamped = Math.max(-120, Math.min(10, db));
  if (clamped <= -120) return 0;
  return Math.round(1200 + clamped * 10);
}

/** Protocol mute: 0 = muted, 1 = open (inverted from boolean). */
export function muteToRawValue(muted: boolean): number {
  return muted ? 0 : 1;
}
