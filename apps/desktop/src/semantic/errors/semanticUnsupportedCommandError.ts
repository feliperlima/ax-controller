import { SemanticResolverError } from "./semanticResolverError";

export class SemanticUnsupportedCommandError extends SemanticResolverError {
  readonly commandName: string;
  readonly profile: string;

  constructor(commandName: string, profile: string) {
    super(
      `Semantic command \"${commandName}\" is not supported for profile \"${profile}\".`,
      "SEMANTIC_UNSUPPORTED_COMMAND"
    );
    this.name = "SemanticUnsupportedCommandError";
    this.commandName = commandName;
    this.profile = profile;
  }
}
