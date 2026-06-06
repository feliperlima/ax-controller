import type { SemanticParameterResolver } from "../contracts";
import { SemanticResolverError, SemanticUnsupportedCommandError } from "../errors";
import type { SemanticCommand, SemanticCommandContext, SemanticProtocolProfile, SemanticResolutionResult } from "../types";
import { resolveAuxMuteParam } from "../../protocol/duonn/protocolAddressing";
import { profileToMixerModel, muteToRawValue } from "./pilotHelpers";

const AUX_MUTE_ADDRESS_RE = /^\/ax\/aux\/(\d+)\/mute$/;

export class SetAuxMutePilotResolver implements SemanticParameterResolver {
  canResolve(commandName: string, profile: SemanticProtocolProfile): boolean {
    return commandName === "setAuxMute" && Boolean(profile);
  }

  resolve(command: SemanticCommand, context: SemanticCommandContext): SemanticResolutionResult {
    if (!context.activeProfile || !context.profileReliable) {
      throw new SemanticResolverError(
        "Semantic setAuxMute requires a reliable active profile.",
        "SEMANTIC_PROFILE_NOT_RELIABLE"
      );
    }

    if (!this.canResolve(command.name, context.activeProfile)) {
      throw new SemanticUnsupportedCommandError(command.name, context.activeProfile);
    }

    const match = command.address.path.match(AUX_MUTE_ADDRESS_RE);
    if (!match) {
      throw new SemanticResolverError(
        `Invalid semantic address for setAuxMute: ${command.address.path}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    const aux = Number(match[1]);
    if (!Number.isInteger(aux) || aux < 1) {
      throw new SemanticResolverError(
        `Invalid AUX index for setAuxMute: ${match[1]}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    if (typeof command.value !== "boolean") {
      throw new SemanticResolverError("setAuxMute expects boolean value.", "SEMANTIC_INVALID_VALUE");
    }

    const model = profileToMixerModel(context.activeProfile, context.capabilities?.channelCount ?? 24);
    const param = resolveAuxMuteParam(model, aux);
    // Protocol mute is inverted: 0 = muted, 1 = open.
    const value = muteToRawValue(command.value);

    return { writes: [{ param, value }] };
  }
}
