export type SemanticAddressSegment = string | number;

export type SemanticAddressPath = `/ax/${string}`;

export interface SemanticAddress {
  path: SemanticAddressPath;
  segments: readonly SemanticAddressSegment[];
}
