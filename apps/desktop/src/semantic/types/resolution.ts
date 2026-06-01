export interface RawParamWrite {
  param: number;
  value: number;
}

export interface SemanticResolutionWarning {
  code: string;
  message: string;
}

export interface SemanticResolutionResult {
  writes: readonly RawParamWrite[];
  warnings?: readonly SemanticResolutionWarning[];
}
