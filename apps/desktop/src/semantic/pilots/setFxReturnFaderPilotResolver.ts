import type { SemanticParameterResolver } from "../contracts";
import { SemanticResolverError, SemanticUnsupportedCommandError } from "../errors";
import type { SemanticCommand, SemanticCommandContext, SemanticProtocolProfile, SemanticResolutionResult } from "../types";
import { resolveFxFaderParam } from "../../protocol/duonn/protocolAddressing";
import { profileToMixerModel, faderDbToRawValue } from "./pilotHelpers";

const FX_FADER_ADDRESS_RE = /^\/ax\/fx\/(\d+)\/fader$/;

export class SetFxReturnFaderPilotResolver implements SemanticParameterResolver {
  canResolve(commandName: string, profile: SemanticProtocolProfile): boolean {
    return commandName === "setFxReturnFader" && Boolean(profile);
  }

  resolve(command: SemanticCommand, context: SemanticCommandContext): SemanticResolutionResult {
    if (!context.activeProfile || !context.profileReliable) {
      throw new SemanticResolverError(
        "Semantic setFxReturnFader requires a reliable active profile.",
        "SEMANTIC_PROFILE_NOT_RELIABLE"
      );
    }

    if (!this.canResolve(command.name, context.activeProfile)) {
      throw new SemanticUnsupportedCommandError(command.name, context.activeProfile);
    }

    const match = command.address.path.match(FX_FADER_ADDRESS_RE);
    if (!match) {
      throw new SemanticResolverError(
        `Invalid semantic address for setFxReturnFader: ${command.address.path}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    const fx = Number(match[1]);
    if (!Number.isInteger(fx) || fx < 1) {
      throw new SemanticResolverError(
        `Invalid FX index for setFxReturnFader: ${match[1]}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    if (typeof command.value !== "number" || !Number.isFinite(command.value)) {
      throw new SemanticResolverError("setFxReturnFader expects numeric dB value.", "SEMANTIC_INVALID_VALUE");
    }

    const model = profileToMixerModel(context.activeProfile, context.capabilities?.channelCount ?? 24);
    const param = resolveFxFaderParam(model, fx);
    const value = faderDbToRawValue(command.value);

    return { writes: [{ param, value }] };
  }
}
