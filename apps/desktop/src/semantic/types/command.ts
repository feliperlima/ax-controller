import type { SemanticAddress } from "./address";
import type { SemanticValue } from "./value";

export type SemanticCommandName =
  | "setChannelFader"
  | "setChannelMute"
  | "setChannelPhantom"
  | "setChannelPan"
  | "setChannelName"
  | "setChannelColor"
  | "setChannelGateEnabled"
  | "setChannelGateThreshold"
  | "setChannelGateAttack"
  | "setChannelGateRelease"
  | "setChannelCompEnabled"
  | "setChannelCompThreshold"
  | "setChannelCompRatio"
  | "setChannelCompAttack"
  | "setChannelCompRelease"
  | "setChannelCompGain"
  | "setChannelEqEnabled"
  | "setChannelEqBand"
  | "setAuxFader"
  | "setAuxMute"
  | "setAuxSolo"
  | "setAuxPan"
  | "setAuxName"
  | "setAuxColor"
  | "setAuxEqEnabled"
  | "setAuxEqBand"
  | "setAuxCompEnabled"
  | "setAuxCompThreshold"
  | "setAuxCompRatio"
  | "setAuxCompAttack"
  | "setAuxCompRelease"
  | "setAuxCompGain"
  | "setFxReturnFader"
  | "setFxReturnMute"
  | "setFxReturnSolo"
  | "setFxName"
  | "setFxColor"
  | "setFxEqEnabled"
  | "setFxEqBand"
  | "setMasterFader"
  | "setMasterMute"
  | "setMasterSolo"
  | "setMasterCompEnabled"
  | "setMasterCompThreshold"
  | "setMasterCompRatio"
  | "setMasterCompAttack"
  | "setMasterCompRelease"
  | "setMasterCompGain"
  | "setMasterEqEnabled"
  | "setMasterEqBand"
  | "setMasterColor"
  | "setAuxSend"
  | "setLinkedStereoSend"
  | "setFxParameter"
  | "setDcaFader"
  | "setMuteGroupActive"
  | "recallScene"
  | "saveScene"
  | (string & {});

export type SemanticCommandSource = "ui" | "sync" | "system" | "automation";

export interface SemanticCommandMeta {
  source?: SemanticCommandSource;
  traceId?: string;
}

export interface SemanticCommand<TValue = SemanticValue> {
  name: SemanticCommandName;
  address: SemanticAddress;
  value: TValue;
  meta?: SemanticCommandMeta;
}
