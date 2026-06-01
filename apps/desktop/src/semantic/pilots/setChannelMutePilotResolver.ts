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

type SetChannelMutePilotResolverOptions = {
  resolveChannelMuteParam: (channel: number) => number;
};

const CHANNEL_MUTE_ADDRESS_RE = /^\/ax\/ch\/(\d+)\/mute$/;

export class SetChannelMutePilotResolver implements SemanticParameterResolver {
  private readonly resolveChannelMuteParam: (channel: number) => number;

  constructor(options: SetChannelMutePilotResolverOptions) {
    this.resolveChannelMuteParam = options.resolveChannelMuteParam;
  }

  canResolve(commandName: string, profile: SemanticProtocolProfile): boolean {
    return commandName === "setChannelMute" && Boolean(profile);
  }

  resolve(
    command: SemanticCommand,
    context: SemanticCommandContext
  ): SemanticResolutionResult {
    if (!context.activeProfile || !context.profileReliable) {
      throw new SemanticResolverError(
        "Semantic setChannelMute requires a reliable active profile.",
        "SEMANTIC_PROFILE_NOT_RELIABLE"
      );
    }

    if (!this.canResolve(command.name, context.activeProfile)) {
      throw new SemanticUnsupportedCommandError(
        command.name,
        context.activeProfile
      );
    }

    const match = command.address.path.match(CHANNEL_MUTE_ADDRESS_RE);
    if (!match) {
      throw new SemanticResolverError(
        `Invalid semantic address for setChannelMute: ${command.address.path}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    const channel = Number(match[1]);
    if (!Number.isInteger(channel) || channel < 1) {
      throw new SemanticResolverError(
        `Invalid channel index for setChannelMute: ${match[1]}`,
        "SEMANTIC_INVALID_CHANNEL"
      );
    }

    if (typeof command.value !== "boolean") {
      throw new SemanticResolverError(
        "setChannelMute expects boolean value.",
        "SEMANTIC_INVALID_VALUE"
      );
    }

    const param = this.resolveChannelMuteParam(channel);
    // Protocol is inverted for mute: 0 = muted, 1 = open.
    const value = command.value ? 0 : 1;

    return {
      writes: [{ param, value }],
    };
  }
}