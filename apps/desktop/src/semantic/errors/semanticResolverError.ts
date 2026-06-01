export class SemanticResolverError extends Error {
  readonly code: string;

  constructor(message: string, code = "SEMANTIC_RESOLVER_ERROR") {
    super(message);
    this.name = "SemanticResolverError";
    this.code = code;
  }
}
