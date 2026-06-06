import type { SemanticParameterResolver } from "../contracts";
import { SemanticResolverError, SemanticUnsupportedCommandError } from "../errors";
import type { SemanticCommand, SemanticCommandContext, SemanticProtocolProfile, SemanticResolutionResult } from "../types";
import { resolveAuxFaderParam } from "../../protocol/duonn/protocolAddressing";
import { profileToMixerModel, faderDbToRawValue } from "./pilotHelpers";

const AUX_FADER_ADDRESS_RE = /^\/ax\/aux\/(\d+)\/fader$/;

export class SetAuxFaderPilotResolver implements SemanticParameterResolver {
  canResolve(commandName: string, profile: SemanticProtocolProfile): boolean {
    return commandName === "setAuxFader" && Boolean(profile);
  }

  resolve(command: SemanticCommand, context: SemanticCommandContext): SemanticResolutionResult {
    if (!context.activeProfile || !context.profileReliable) {
      throw new SemanticResolverError(
        "Semantic setAuxFader requires a reliable active profile.",
        "SEMANTIC_PROFILE_NOT_RELIABLE"
      );
    }

    if (!this.canResolve(command.name, context.activeProfile)) {
      throw new SemanticUnsupportedCommandError(command.name, context.activeProfile);
    }

    const match = command.address.path.match(AUX_FADER_ADDRESS_RE);
    if (!match) {
      throw new SemanticResolverError(
        `Invalid semantic address for setAuxFader: ${command.address.path}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    const aux = Number(match[1]);
    if (!Number.isInteger(aux) || aux < 1) {
      throw new SemanticResolverError(
        `Invalid AUX index for setAuxFader: ${match[1]}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    if (typeof command.value !== "number" || !Number.isFinite(command.value)) {
      throw new SemanticResolverError("setAuxFader expects numeric dB value.", "SEMANTIC_INVALID_VALUE");
    }

    const model = profileToMixerModel(context.activeProfile, context.capabilities?.channelCount ?? 24);
    const param = resolveAuxFaderParam(model, aux);
    const value = faderDbToRawValue(command.value);

    return { writes: [{ param, value }] };
  }
}
