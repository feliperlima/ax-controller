import type { ReactNode } from "react";
import { MixerEmptySlot } from "./MixerEmptySlot";

type MixerStripGridProps = {
  items: ReactNode[];
  emptySlots?: number;
};

export function MixerStripGrid({ items, emptySlots = 0 }: MixerStripGridProps) {
  return (
    <div className="mixer-strip-grid">
      {items.map((item, index) => (
        <div key={`mixer-strip-slot-${index}`} className="mixer-strip-grid__slot">
          {item}
        </div>
      ))}
      {Array.from({ length: emptySlots }, (_, index) => (
        <div key={`mixer-empty-slot-${index}`} className="mixer-strip-grid__slot">
          <MixerEmptySlot />
        </div>
      ))}
    </div>
  );
}