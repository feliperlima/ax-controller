import { memo } from "react";
import { ChannelStrip, type ChannelStripProps } from "./ChannelStrip";
import type { DomainSelectors } from "../lib/domainSelectors";
import type { UniversalRawParamStore } from "../lib/universalRawParamStore";
import { useRawParamSelector } from "../hooks/useRawParamSelector";

type IsolatedChannelStripProps = ChannelStripProps & {
  rawParamStore: UniversalRawParamStore;
  domainSelectors: DomainSelectors;
};

function IsolatedChannelStripComponent({
  rawParamStore,
  domainSelectors,
  channel = 1,
  muted,
  soloOn,
  faderDb,
  faderPosition,
  pan,
  ...rest
}: IsolatedChannelStripProps) {
  const selectedStrip = useRawParamSelector(
    rawParamStore,
    (store) => {
      void store;
      return domainSelectors.selectChannelStrip(channel);
    },
    (previous, next) =>
      previous.fader?.rawValue === next.fader?.rawValue &&
      previous.fader?.position === next.fader?.position &&
      previous.mute?.rawValue === next.mute?.rawValue &&
      previous.mute?.muted === next.mute?.muted &&
      previous.solo?.leftRawValue === next.solo?.leftRawValue &&
      previous.solo?.rightRawValue === next.solo?.rightRawValue &&
      previous.solo?.soloOn === next.solo?.soloOn &&
      previous.pan?.rawValue === next.pan?.rawValue &&
      previous.pan?.pan === next.pan?.pan
  );

  return (
    <ChannelStrip
      channel={channel}
      muted={muted}
      soloOn={soloOn}
      faderDb={selectedStrip.fader?.db ?? faderDb}
      faderPosition={selectedStrip.fader?.position ?? faderPosition}
      pan={selectedStrip.pan?.pan ?? pan}
      {...rest}
    />
  );
}

export const IsolatedChannelStrip = memo(IsolatedChannelStripComponent);
