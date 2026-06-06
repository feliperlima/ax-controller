import type { SemanticParameterResolver } from "../contracts";
import { SemanticResolverError, SemanticUnsupportedCommandError } from "../errors";
import type { SemanticCommand, SemanticCommandContext, SemanticProtocolProfile, SemanticResolutionResult } from "../types";
import { resolveMasterFaderParam } from "../../protocol/duonn/protocolAddressing";
import { profileToMixerModel, faderDbToRawValue } from "./pilotHelpers";

const MASTER_FADER_ADDRESS_RE = /^\/ax\/master\/(left|right)\/fader$/;

export class SetMasterFaderPilotResolver implements SemanticParameterResolver {
  canResolve(commandName: string, profile: SemanticProtocolProfile): boolean {
    return commandName === "setMasterFader" && Boolean(profile);
  }

  resolve(command: SemanticCommand, context: SemanticCommandContext): SemanticResolutionResult {
    if (!context.activeProfile || !context.profileReliable) {
      throw new SemanticResolverError(
        "Semantic setMasterFader requires a reliable active profile.",
        "SEMANTIC_PROFILE_NOT_RELIABLE"
      );
    }

    if (!this.canResolve(command.name, context.activeProfile)) {
      throw new SemanticUnsupportedCommandError(command.name, context.activeProfile);
    }

    const match = command.address.path.match(MASTER_FADER_ADDRESS_RE);
    if (!match) {
      throw new SemanticResolverError(
        `Invalid semantic address for setMasterFader: ${command.address.path}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    const side = match[1] as "left" | "right";

    if (typeof command.value !== "number" || !Number.isFinite(command.value)) {
      throw new SemanticResolverError("setMasterFader expects numeric dB value.", "SEMANTIC_INVALID_VALUE");
    }

    const model = profileToMixerModel(context.activeProfile, context.capabilities?.channelCount ?? 24);
    const param = resolveMasterFaderParam(model, side);
    const value = faderDbToRawValue(command.value);

    return { writes: [{ param, value }] };
  }
}
