import type { SemanticParameterResolver } from "../contracts";
import { SemanticResolverError, SemanticUnsupportedCommandError } from "../errors";
import type { SemanticCommand, SemanticCommandContext, SemanticProtocolProfile, SemanticResolutionResult } from "../types";
import { resolveChannelToFxSendParam } from "../../protocol/duonn/protocolAddressing";
import { profileToMixerModel, faderDbToRawValue } from "./pilotHelpers";

const FX_SEND_ADDRESS_RE = /^\/ax\/ch\/(\d+)\/send\/fx\/(\d+)$/;

export class SetFxSendPilotResolver implements SemanticParameterResolver {
  canResolve(commandName: string, profile: SemanticProtocolProfile): boolean {
    return commandName === "setFxParameter" && Boolean(profile);
  }

  resolve(command: SemanticCommand, context: SemanticCommandContext): SemanticResolutionResult {
    if (!context.activeProfile || !context.profileReliable) {
      throw new SemanticResolverError(
        "Semantic setFxParameter requires a reliable active profile.",
        "SEMANTIC_PROFILE_NOT_RELIABLE"
      );
    }

    if (!this.canResolve(command.name, context.activeProfile)) {
      throw new SemanticUnsupportedCommandError(command.name, context.activeProfile);
    }

    const match = command.address.path.match(FX_SEND_ADDRESS_RE);
    if (!match) {
      throw new SemanticResolverError(
        `Invalid semantic address for setFxParameter: ${command.address.path}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    const channel = Number(match[1]);
    const fx = Number(match[2]);
    if (!Number.isInteger(channel) || channel < 1) {
      throw new SemanticResolverError(
        `Invalid channel index for setFxParameter: ${match[1]}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }
    if (!Number.isInteger(fx) || fx < 1) {
      throw new SemanticResolverError(
        `Invalid FX index for setFxParameter: ${match[2]}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    if (typeof command.value !== "number" || !Number.isFinite(command.value)) {
      throw new SemanticResolverError("setFxParameter expects numeric dB value.", "SEMANTIC_INVALID_VALUE");
    }

    const model = profileToMixerModel(context.activeProfile, context.capabilities?.channelCount ?? 24);
    // channelIndex is 0-based; channel param is 1-based from the address
    const param = resolveChannelToFxSendParam(model, channel - 1, fx);
    const value = faderDbToRawValue(command.value);

    return { writes: [{ param, value }] };
  }
}
