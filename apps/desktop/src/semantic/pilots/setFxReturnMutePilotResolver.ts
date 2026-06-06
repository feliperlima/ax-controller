import type { SemanticParameterResolver } from "../contracts";
import { SemanticResolverError, SemanticUnsupportedCommandError } from "../errors";
import type { SemanticCommand, SemanticCommandContext, SemanticProtocolProfile, SemanticResolutionResult } from "../types";
import { resolveFxMuteParam } from "../../protocol/duonn/protocolAddressing";
import { profileToMixerModel, muteToRawValue } from "./pilotHelpers";

const FX_MUTE_ADDRESS_RE = /^\/ax\/fx\/(\d+)\/mute$/;

export class SetFxReturnMutePilotResolver implements SemanticParameterResolver {
  canResolve(commandName: string, profile: SemanticProtocolProfile): boolean {
    return commandName === "setFxReturnMute" && Boolean(profile);
  }

  resolve(command: SemanticCommand, context: SemanticCommandContext): SemanticResolutionResult {
    if (!context.activeProfile || !context.profileReliable) {
      throw new SemanticResolverError(
        "Semantic setFxReturnMute requires a reliable active profile.",
        "SEMANTIC_PROFILE_NOT_RELIABLE"
      );
    }

    if (!this.canResolve(command.name, context.activeProfile)) {
      throw new SemanticUnsupportedCommandError(command.name, context.activeProfile);
    }

    const match = command.address.path.match(FX_MUTE_ADDRESS_RE);
    if (!match) {
      throw new SemanticResolverError(
        `Invalid semantic address for setFxReturnMute: ${command.address.path}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    const fx = Number(match[1]);
    if (!Number.isInteger(fx) || fx < 1) {
      throw new SemanticResolverError(
        `Invalid FX index for setFxReturnMute: ${match[1]}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    if (typeof command.value !== "boolean") {
      throw new SemanticResolverError("setFxReturnMute expects boolean value.", "SEMANTIC_INVALID_VALUE");
    }

    const model = profileToMixerModel(context.activeProfile, context.capabilities?.channelCount ?? 24);
    const param = resolveFxMuteParam(model, fx);
    // Protocol mute is inverted: 0 = muted, 1 = open.
    const value = muteToRawValue(command.value);

    return { writes: [{ param, value }] };
  }
}
