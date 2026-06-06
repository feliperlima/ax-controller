import type { SemanticParameterResolver } from "../contracts";
import { SemanticResolverError, SemanticUnsupportedCommandError } from "../errors";
import type { SemanticCommand, SemanticCommandContext, SemanticProtocolProfile, SemanticResolutionResult } from "../types";
import { resolveMasterMuteParam } from "../../protocol/duonn/protocolAddressing";
import { profileToMixerModel, muteToRawValue } from "./pilotHelpers";

const MASTER_MUTE_ADDRESS_RE = /^\/ax\/master\/(left|right)\/mute$/;

export class SetMasterMutePilotResolver implements SemanticParameterResolver {
  canResolve(commandName: string, profile: SemanticProtocolProfile): boolean {
    return commandName === "setMasterMute" && Boolean(profile);
  }

  resolve(command: SemanticCommand, context: SemanticCommandContext): SemanticResolutionResult {
    if (!context.activeProfile || !context.profileReliable) {
      throw new SemanticResolverError(
        "Semantic setMasterMute requires a reliable active profile.",
        "SEMANTIC_PROFILE_NOT_RELIABLE"
      );
    }

    if (!this.canResolve(command.name, context.activeProfile)) {
      throw new SemanticUnsupportedCommandError(command.name, context.activeProfile);
    }

    const match = command.address.path.match(MASTER_MUTE_ADDRESS_RE);
    if (!match) {
      throw new SemanticResolverError(
        `Invalid semantic address for setMasterMute: ${command.address.path}`,
        "SEMANTIC_INVALID_ADDRESS"
      );
    }

    const side = match[1] as "left" | "right";

    if (typeof command.value !== "boolean") {
      throw new SemanticResolverError("setMasterMute expects boolean value.", "SEMANTIC_INVALID_VALUE");
    }

    const model = profileToMixerModel(context.activeProfile, context.capabilities?.channelCount ?? 24);
    const param = resolveMasterMuteParam(model, side);
    // Protocol mute is inverted: 0 = muted, 1 = open.
    const value = muteToRawValue(command.value);

    return { writes: [{ param, value }] };
  }
}
