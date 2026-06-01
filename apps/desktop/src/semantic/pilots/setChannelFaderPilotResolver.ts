import type { SemanticParameterResolver } from "../contracts";
import {
  SemanticResolverError,
  SemanticUnsupportedCommandError,
} from "../errors";
import type {
  SemanticCommand,
  SemanticCommandContext,
  SemanticProtocolProfile,
  SemanticResolutionResult,
} from "../types";

type SetChannelFaderPilotResolverOptions = {
  resolveChannelFaderParam: (channel: number) => number;
};

const CHANNEL_FADER_ADDRESS_RE = /^\/ax\/ch\/(\d+)\/fader$/;

function faderDbToRawValue(db: number) {
  const clamped = Math.max(-120, Math.min(10, db));
  if (clamped <= -120) return 0;
  return Math.round(1200 + clamped * 10);
}

export class SetChannelFaderPilotResolver implements SemanticParameterResolver {
  private readonly resolveChannelFaderParam: (channel: number) => number;

  constructor(options: SetChannelFaderPilotResolverOptions) {
    this.resolveChannelFaderParam = options.resolveChannelFaderParam;
  }

  canResolve(commandName: string, profile: SemanticProtocolProfile): boolean {
    return commandName === "setChannelFader" && Boolean(profile);
  }

  resolve(
    command: SemanticCommand,
    context: SemanticCommandContext
  ): SemanticResolutionResult {
    if (!context.activeProfile || !context.profileReliable) {
      throw new SemanticResolverError(
        "Semantic setChannelFader requires a reliable active profile.",
        "SEMANTIC_PROFILE_NOT_RELIABLE"
      );
    }

    if (!this.canResolve(command.name, context.activeProfile)) {
      throw new SemanticUnsupportedCommandError(
        command.name,
        context.activeProfile
      );
    }

    const match = command.address.path.match(CHANNEL_FADER_ADDRESS_RE);
    if (!match) {
      throw new SemanticResolverError(
        `Invalid semantic address for setChannelFader: ${command.address.path}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    const channel = Number(match[1]);
    if (!Number.isInteger(channel) || channel < 1) {
      throw new SemanticResolverError(
        `Invalid channel index for setChannelFader: ${match[1]}`,
        "SEMANTIC_INVALID_CHANNEL"
      );
    }

    if (typeof command.value !== "number" || !Number.isFinite(command.value)) {
      throw new SemanticResolverError(
        "setChannelFader expects numeric dB value.",
        "SEMANTIC_INVALID_VALUE"
      );
    }

    const param = this.resolveChannelFaderParam(channel);
    const value = faderDbToRawValue(command.value);

    return {
      writes: [{ param, value }],
    };
  }
}
