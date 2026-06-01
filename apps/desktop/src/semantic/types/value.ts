export interface SemanticCommandEventValue {
  kind: "command";
  name: string;
  payload?: Record<string, unknown>;
}

export type SemanticValue =
  | boolean
  | number
  | string
  | SemanticCommandEventValue;
