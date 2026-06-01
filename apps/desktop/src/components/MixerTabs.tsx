import type { CSSProperties, ReactNode } from "react";
import { FixedMasterBus } from "./FixedMasterBus";
import { MixerStripGrid } from "./MixerStripGrid";

export type MixerTabDefinition = {
  id: string;
  label: string;
  itemCount: number;
  items: ReactNode[];
  visibleSlots?: number;
};

type MixerTabsProps = {
  tabs: MixerTabDefinition[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  master: ReactNode;
};

export function MixerTabs({ tabs, activeTabId, onTabChange, master }: MixerTabsProps) {
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;
  const activeItems = activeTab?.items ?? [];
  const visibleSlots = Math.max(1, activeTab?.visibleSlots ?? 8);
  const emptySlots = Math.max(0, visibleSlots - activeItems.length);
  const tabContentStyle = {
    "--tab-visible-slots": String(visibleSlots),
  } as CSSProperties;

  return (
    <section className="mixer-layout mixer-tabs-layout">
      <div className="mixer-tab-bar" role="tablist" aria-label="Mixer tabs">
        {tabs.map((tab) => {
          const active = tab.id === activeTab?.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`mixer-tab-bar__button ${active ? "is-active" : ""}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="mixer-tab-bar__label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mixer-tabs-layout__content-row">
        <div className="mixer-tab-content" style={tabContentStyle}>
          <MixerStripGrid items={activeItems} emptySlots={emptySlots} />
        </div>

        <FixedMasterBus>{master}</FixedMasterBus>
      </div>
    </section>
  );
}