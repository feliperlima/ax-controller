import type { SemanticParameterResolver } from "../contracts";
import { SemanticResolverError, SemanticUnsupportedCommandError } from "../errors";
import type { SemanticCommand, SemanticCommandContext, SemanticProtocolProfile, SemanticResolutionResult } from "../types";
import { resolveChannelToAuxSendParam } from "../../protocol/duonn/protocolAddressing";
import { profileToMixerModel, faderDbToRawValue } from "./pilotHelpers";

const AUX_SEND_ADDRESS_RE = /^\/ax\/ch\/(\d+)\/send\/aux\/(\d+)$/;

export class SetAuxSendPilotResolver implements SemanticParameterResolver {
  canResolve(commandName: string, profile: SemanticProtocolProfile): boolean {
    return commandName === "setAuxSend" && Boolean(profile);
  }

  resolve(command: SemanticCommand, context: SemanticCommandContext): SemanticResolutionResult {
    if (!context.activeProfile || !context.profileReliable) {
      throw new SemanticResolverError(
        "Semantic setAuxSend requires a reliable active profile.",
        "SEMANTIC_PROFILE_NOT_RELIABLE"
      );
    }

    if (!this.canResolve(command.name, context.activeProfile)) {
      throw new SemanticUnsupportedCommandError(command.name, context.activeProfile);
    }

    const match = command.address.path.match(AUX_SEND_ADDRESS_RE);
    if (!match) {
      throw new SemanticResolverError(
        `Invalid semantic address for setAuxSend: ${command.address.path}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    const channel = Number(match[1]);
    const aux = Number(match[2]);
    if (!Number.isInteger(channel) || channel < 1) {
      throw new SemanticResolverError(
        `Invalid channel index for setAuxSend: ${match[1]}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }
    if (!Number.isInteger(aux) || aux < 1) {
      throw new SemanticResolverError(
        `Invalid AUX index for setAuxSend: ${match[2]}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    if (typeof command.value !== "number" || !Number.isFinite(command.value)) {
      throw new SemanticResolverError("setAuxSend expects numeric dB value.", "SEMANTIC_INVALID_VALUE");
    }

    const model = profileToMixerModel(context.activeProfile, context.capabilities?.channelCount ?? 24);
    // channelIndex is 0-based; channel param is 1-based from the address
    const param = resolveChannelToAuxSendParam(model, channel - 1, aux);
    const value = faderDbToRawValue(command.value);

    return { writes: [{ param, value }] };
  }
}
