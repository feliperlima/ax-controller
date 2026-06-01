import type {
  SemanticCommand,
  SemanticCommandContext,
  SemanticCommandName,
  SemanticProtocolProfile,
  SemanticResolutionResult,
} from "../types";

export interface SemanticParameterResolver {
  canResolve(commandName: SemanticCommandName, profile: SemanticProtocolProfile): boolean;
  resolve(command: SemanticCommand, context: SemanticCommandContext): SemanticResolutionResult;
}
