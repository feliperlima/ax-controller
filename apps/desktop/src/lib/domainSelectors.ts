import type { UniversalRawParamStore } from "./universalRawParamStore";

export type ParamMap = Record<string, number | undefined>;

export type ChannelParamResolver = {
  getFaderParam: (channelId: number) => number;
  getMuteParam: (channelId: number) => number;
  getSoloLeftParam: (channelId: number) => number;
  getSoloRightParam: (channelId: number) => number;
  getPanParam: (channelId: number) => number;
};

export type AppParamResolver = ChannelParamResolver & {
  getChannelLinkParams?: (pairOdd: number) => ParamMap;
  getAuxLinkParams?: (pairOdd: number) => ParamMap;
  getMasterLinkParams?: () => ParamMap;
  getAuxParams?: (auxId: number) => ParamMap;
  getFxParams?: (fxId: number) => ParamMap;
  getDcaParams?: (dcaId: number) => ParamMap;
  getMuteGroupParams?: (groupId: number) => ParamMap;
  getMasterParams?: () => ParamMap;
  getMasterProcessorParams?: (side: "left" | "right") => ParamMap;
  getSendParams?: (channelId: number, sendId: string) => ParamMap;
  getChannelProcessorParams?: (channelId: number) => ParamMap;
  getAuxProcessorParams?: (auxId: number) => ParamMap;
  getFxProcessorParams?: (fxId: number) => ParamMap;
  getFxPresetParams?: (fxId: number) => ParamMap;
};

export type ChannelValueDecoder = {
  faderRawToDb: (rawValue: number) => number;
  faderDbToPosition: (dbValue: number) => number;
  muteRawToBoolean: (rawValue: number) => boolean;
  soloRawToBoolean: (rawValue: number) => boolean;
  panRawToValue: (rawValue: number) => number;
  channelLinkRawToBoolean?: (
    pairOdd: number,
    linkRaw: number | undefined,
    oddPanRaw: number | undefined,
    evenPanRaw: number | undefined
  ) => boolean | null;
  auxLinkRawToBoolean?: (pairOdd: number, linkMaskRaw: number | undefined) => boolean | null;
  masterLinkRawToBoolean?: (linkMaskRaw: number | undefined) => boolean | null;
};

export type SelectedRawParam = {
  paramId: number;
  value: number;
  timestamp: number;
};

export type SelectedParamGroup = Record<string, SelectedRawParam | null>;

export type SelectedFader = {
  rawValue: number;
  db: number;
  position: number;
};

export type SelectedMute = {
  rawValue: number;
  muted: boolean;
};

export type SelectedSolo = {
  leftRawValue?: number;
  rightRawValue?: number;
  soloOn: boolean;
};

export type SelectedPan = {
  rawValue: number;
  pan: number;
};

export type SelectedLink = {
  linked: boolean;
  status: "known" | "unknown";
  rawValue?: number;
};

export type SelectedChannelFader = SelectedFader;
export type SelectedChannelMute = SelectedMute;
export type SelectedChannelSolo = SelectedSolo;
export type SelectedChannelPan = SelectedPan;

export type SelectedChannelStrip = {
  fader: SelectedChannelFader | null;
  mute: SelectedChannelMute | null;
  solo: SelectedChannelSolo | null;
  pan: SelectedChannelPan | null;
};

export type SelectedBasicStrip = {
  fader: SelectedFader | null;
  mute: SelectedMute | null;
  solo: SelectedSolo | null;
  params: SelectedParamGroup;
};

export type DomainSelectors = {
  selectRawParam: (paramId: number | undefined) => SelectedRawParam | null;
  selectParamGroup: (params: ParamMap) => SelectedParamGroup;
  selectFaderByParam: (paramId: number | undefined) => SelectedFader | null;
  selectMuteByParam: (paramId: number | undefined) => SelectedMute | null;
  selectSoloByParams: (leftParamId: number | undefined, rightParamId: number | undefined) => SelectedSolo | null;
  selectChannelLink: (pairOdd: number) => SelectedLink | null;
  selectAuxLink: (pairOdd: number) => SelectedLink | null;
  selectMasterLink: () => SelectedLink | null;
  selectChannelStrip: (channelId: number) => SelectedChannelStrip;
  selectChannelFader: (channelId: number) => SelectedChannelFader | null;
  selectChannelMute: (channelId: number) => SelectedChannelMute | null;
  selectChannelSolo: (channelId: number) => SelectedChannelSolo | null;
  selectChannelPan: (channelId: number) => SelectedChannelPan | null;
  selectAuxStrip: (auxId: number) => SelectedBasicStrip | null;
  selectFxStrip: (fxId: number) => SelectedBasicStrip | null;
  selectDcaGroup: (dcaId: number) => SelectedParamGroup | null;
  selectMuteGroup: (groupId: number) => SelectedParamGroup | null;
  selectMaster: () => SelectedParamGroup | null;
  selectMasterProcessor: (side: "left" | "right") => SelectedParamGroup | null;
  selectSend: (channelId: number, sendId: string) => SelectedParamGroup | null;
  selectChannelProcessor: (channelId: number) => SelectedParamGroup | null;
  selectAuxProcessor: (auxId: number) => SelectedParamGroup | null;
  selectFxProcessor: (fxId: number) => SelectedParamGroup | null;
  selectFxPreset: (fxId: number) => SelectedParamGroup | null;
};

function normalizeParamGroup(params: ParamMap | undefined) {
  if (!params) return null;
  return Object.fromEntries(
    Object.entries(params).filter(([, paramId]) => typeof paramId === "number")
  ) as Record<string, number>;
}

export function createDomainSelectors(
  rawParamStore: UniversalRawParamStore,
  resolver: AppParamResolver,
  decoder: ChannelValueDecoder
): DomainSelectors {
  function selectRawParam(paramId: number | undefined): SelectedRawParam | null {
    if (paramId === undefined) return null;
    const entry = rawParamStore.getRawParam(paramId);
    if (!entry) return null;

    return {
      paramId,
      value: entry.value,
      timestamp: entry.timestamp,
    };
  }

  function selectParamGroup(params: ParamMap): SelectedParamGroup {
    const group: SelectedParamGroup = {};
    Object.entries(params).forEach(([key, paramId]) => {
      group[key] = selectRawParam(paramId);
    });
    return group;
  }

  function selectFaderByParam(paramId: number | undefined): SelectedFader | null {
    const entry = selectRawParam(paramId);
    if (!entry) return null;

    const db = decoder.faderRawToDb(entry.value);
    return {
      rawValue: entry.value,
      db,
      position: decoder.faderDbToPosition(db),
    };
  }

  function selectMuteByParam(paramId: number | undefined): SelectedMute | null {
    const entry = selectRawParam(paramId);
    if (!entry) return null;

    return {
      rawValue: entry.value,
      muted: decoder.muteRawToBoolean(entry.value),
    };
  }

  function selectSoloByParams(
    leftParamId: number | undefined,
    rightParamId: number | undefined
  ): SelectedSolo | null {
    const leftEntry = selectRawParam(leftParamId);
    const rightEntry = selectRawParam(rightParamId);
    if (!leftEntry && !rightEntry) return null;

    const leftSolo = leftEntry ? decoder.soloRawToBoolean(leftEntry.value) : false;
    const rightSolo = rightEntry ? decoder.soloRawToBoolean(rightEntry.value) : false;

    return {
      leftRawValue: leftEntry?.value,
      rightRawValue: rightEntry?.value,
      soloOn: leftSolo || rightSolo,
    };
  }

  function selectChannelFader(channelId: number): SelectedChannelFader | null {
    return selectFaderByParam(resolver.getFaderParam(channelId));
  }

  function selectChannelMute(channelId: number): SelectedChannelMute | null {
    return selectMuteByParam(resolver.getMuteParam(channelId));
  }

  function selectChannelSolo(channelId: number): SelectedChannelSolo | null {
    return selectSoloByParams(
      resolver.getSoloLeftParam(channelId),
      resolver.getSoloRightParam(channelId)
    );
  }

  function selectChannelPan(channelId: number): SelectedChannelPan | null {
    const entry = selectRawParam(resolver.getPanParam(channelId));
    if (!entry) return null;

    return {
      rawValue: entry.value,
      pan: decoder.panRawToValue(entry.value),
    };
  }

  function selectChannelLink(pairOdd: number): SelectedLink | null {
    const params = normalizeParamGroup(resolver.getChannelLinkParams?.(pairOdd));
    if (!params || !decoder.channelLinkRawToBoolean) return null;

    const linkRaw = selectRawParam(params.link)?.value;
    const oddPanRaw = selectRawParam(params.oddPan)?.value;
    const evenPanRaw = selectRawParam(params.evenPan)?.value;
    const linked = decoder.channelLinkRawToBoolean(pairOdd, linkRaw, oddPanRaw, evenPanRaw);
    if (linked === null) {
      return { linked: false, status: "unknown", rawValue: linkRaw };
    }

    return { linked, status: "known", rawValue: linkRaw };
  }

  function selectAuxLink(pairOdd: number): SelectedLink | null {
    const params = normalizeParamGroup(resolver.getAuxLinkParams?.(pairOdd));
    if (!params || !decoder.auxLinkRawToBoolean) return null;

    const maskRaw = selectRawParam(params.linkMask)?.value;
    const linked = decoder.auxLinkRawToBoolean(pairOdd, maskRaw);
    if (linked === null) {
      return { linked: false, status: "unknown", rawValue: maskRaw };
    }

    return { linked, status: "known", rawValue: maskRaw };
  }

  function selectMasterLink(): SelectedLink | null {
    const params = normalizeParamGroup(resolver.getMasterLinkParams?.());
    if (!params || !decoder.masterLinkRawToBoolean) return null;

    const maskRaw = selectRawParam(params.linkMask)?.value;
    const linked = decoder.masterLinkRawToBoolean(maskRaw);
    if (linked === null) {
      return { linked: false, status: "unknown", rawValue: maskRaw };
    }

    return { linked, status: "known", rawValue: maskRaw };
  }

  function selectChannelStrip(channelId: number): SelectedChannelStrip {
    return {
      fader: selectChannelFader(channelId),
      mute: selectChannelMute(channelId),
      solo: selectChannelSolo(channelId),
      pan: selectChannelPan(channelId),
    };
  }

  function selectAuxStrip(auxId: number): SelectedBasicStrip | null {
    const params = normalizeParamGroup(resolver.getAuxParams?.(auxId));
    if (!params) return null;

    return {
      fader: selectFaderByParam(params.fader),
      mute: selectMuteByParam(params.mute),
      solo: selectSoloByParams(params.soloLeft, params.soloRight),
      params: selectParamGroup(params),
    };
  }

  function selectFxStrip(fxId: number): SelectedBasicStrip | null {
    const params = normalizeParamGroup(resolver.getFxParams?.(fxId));
    if (!params) return null;

    return {
      fader: selectFaderByParam(params.fader),
      mute: selectMuteByParam(params.mute),
      solo: selectSoloByParams(params.soloLeft, params.soloRight),
      params: selectParamGroup(params),
    };
  }

  function selectDcaGroup(dcaId: number) {
    const params = normalizeParamGroup(resolver.getDcaParams?.(dcaId));
    return params ? selectParamGroup(params) : null;
  }

  function selectMuteGroup(groupId: number) {
    const params = normalizeParamGroup(resolver.getMuteGroupParams?.(groupId));
    return params ? selectParamGroup(params) : null;
  }

  function selectMaster() {
    const params = normalizeParamGroup(resolver.getMasterParams?.());
    return params ? selectParamGroup(params) : null;
  }

  function selectMasterProcessor(side: "left" | "right") {
    const params = normalizeParamGroup(resolver.getMasterProcessorParams?.(side));
    return params ? selectParamGroup(params) : null;
  }

  function selectSend(channelId: number, sendId: string) {
    const params = normalizeParamGroup(resolver.getSendParams?.(channelId, sendId));
    return params ? selectParamGroup(params) : null;
  }

  function selectChannelProcessor(channelId: number) {
    const params = normalizeParamGroup(resolver.getChannelProcessorParams?.(channelId));
    return params ? selectParamGroup(params) : null;
  }

  function selectAuxProcessor(auxId: number) {
    const params = normalizeParamGroup(resolver.getAuxProcessorParams?.(auxId));
    return params ? selectParamGroup(params) : null;
  }

  function selectFxProcessor(fxId: number) {
    const params = normalizeParamGroup(resolver.getFxProcessorParams?.(fxId));
    return params ? selectParamGroup(params) : null;
  }

  function selectFxPreset(fxId: number) {
    const params = normalizeParamGroup(resolver.getFxPresetParams?.(fxId));
    return params ? selectParamGroup(params) : null;
  }

  return {
    selectRawParam,
    selectParamGroup,
    selectFaderByParam,
    selectMuteByParam,
    selectSoloByParams,
    selectChannelLink,
    selectAuxLink,
    selectMasterLink,
    selectChannelStrip,
    selectChannelFader,
    selectChannelMute,
    selectChannelSolo,
    selectChannelPan,
    selectAuxStrip,
    selectFxStrip,
    selectDcaGroup,
    selectMuteGroup,
    selectMaster,
    selectMasterProcessor,
    selectSend,
    selectChannelProcessor,
    selectAuxProcessor,
    selectFxProcessor,
    selectFxPreset,
  };
}
