import { VerticalFader } from "./VerticalFader";
import { useRef } from "react";
import {
  DCA_FADER_SNAP_POINTS,
  dcaDbToPosition,
  dcaFaderLabel,
  dcaPositionToDb,
  dcaValueToPosition,
} from "../lib/groupControls";
import type { UniversalRawParamStore } from "../lib/universalRawParamStore";
import type { DomainSelectors } from "../lib/domainSelectors";
import { useRawParamSelector } from "../hooks/useRawParamSelector";

type GroupStripProps = {
  kind: "dca" | "mute";
  groupId: number;
  groupName: string;
  memberCount: number;
  active: boolean;
  faderPosition?: number;
  disabled?: boolean;
  accentColor?: string;
  onToggleActive: () => void;
  onFaderChange?: (value: number) => void;
  onOpenDetail?: (groupId: number) => void;
  onOpenEditMenu?: (groupId: number) => void;
  rawParamStore?: UniversalRawParamStore;
  domainSelectors?: DomainSelectors;
};

const DCA_FADER_TRACK_WIDTH = 23;
const FOOTER_LONG_PRESS_MS = 450;

export function GroupStrip({
  kind,
  groupId,
  groupName,
  memberCount,
  active,
  faderPosition = dcaDbToPosition(0),
  disabled = false,
  accentColor,
  onToggleActive,
  onFaderChange,
  onOpenDetail,
  onOpenEditMenu,
  rawParamStore,
  domainSelectors,
}: GroupStripProps) {
  const storeGroup = useRawParamSelector(
    rawParamStore ?? null,
    (store) => {
      void store;
      if (kind === "dca") return domainSelectors?.selectDcaGroup(groupId) ?? null;
      return domainSelectors?.selectMuteGroup(groupId) ?? null;
    },
    (prev, next) =>
      prev?.onOff?.value === next?.onOff?.value &&
      prev?.fader?.value === next?.fader?.value &&
      prev?.active?.value === next?.active?.value
  );
  const activeActive =
    storeGroup
      ? kind === "dca"
        ? (storeGroup.onOff?.value ?? -1) > 0
        : (storeGroup.active?.value ?? -1) > 0
      : active;
  const activeFaderPosition =
    kind === "dca" && storeGroup?.fader != null
      ? dcaValueToPosition(storeGroup.fader.value)
      : faderPosition;
  const isDca = kind === "dca";
  const resolvedAccentColor = isDca ? (accentColor ?? "var(--channel-05, #7b7b7b)") : "var(--button-mute-border)";
  const footerLabel = isDca ? `DCA ${groupId}` : `MUTE ${groupId}`;
  const buttonLabel = isDca ? (activeActive ? "ON" : "OFF") : "MUTE";
  const buttonClass = isDca
    ? activeActive
      ? "var(--button-phase-bg)"
      : "var(--button-default-bg)"
    : activeActive
      ? "var(--button-mute-bg)"
      : "var(--button-default-bg)";
  const buttonBorder = isDca
    ? activeActive
      ? "2px solid var(--button-phase-border)"
      : "1px solid var(--button-default-border)"
    : activeActive
      ? "2px solid var(--button-mute-border)"
      : "1px solid var(--button-default-border)";
  const buttonColor = isDca
    ? activeActive
      ? "var(--button-phase-text)"
      : "var(--button-default-text)"
    : activeActive
      ? "var(--button-mute-text)"
      : "var(--button-default-text)";
  const canOpenDetail = typeof onOpenDetail === "function";
  const canOpenEditMenu = typeof onOpenEditMenu === "function";
  const footerLongPressTimerRef = useRef<number | null>(null);
  const footerLongPressTriggeredRef = useRef(false);

  function clearFooterLongPress() {
    if (footerLongPressTimerRef.current !== null) {
      window.clearTimeout(footerLongPressTimerRef.current);
      footerLongPressTimerRef.current = null;
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        overflow: "hidden",
        padding: 0,
        borderRadius: "4px",
        width: "var(--strip-width)",
        minWidth: "var(--strip-width)",
        height: "100%",
        backgroundColor: "var(--surface-card)",
        boxShadow: "0px 4px 2px rgba(0,0,0,0.25)",
        color: "var(--text-primary)",
        fontFamily: "system-ui, sans-serif",
        fontSize: "10px",
      }}
    >
      <div
        style={{
          width: "100%",
          flex: "1 1 0",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "6px 4px 6px",
          boxSizing: "border-box",
        }}
      >
        {!isDca && (
          <div
            style={{
              width: "100%",
              height: 48,
              borderRadius: 4,
              background: "rgba(0,0,0,0.8)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "4px 6px",
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: resolvedAccentColor,
              }}
            >
              {footerLabel}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              {memberCount} MEMBERS
            </span>
          </div>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={onToggleActive}
          style={{
            width: "100%",
            height: 32,
            borderRadius: 8,
            border: buttonBorder,
            background: buttonClass,
            color: buttonColor,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.12em",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            boxShadow: isDca && activeActive ? "var(--button-phase-glow)" : !isDca && activeActive ? "var(--button-mute-glow)" : "none",
          }}
        >
          {buttonLabel}
        </button>

        {isDca ? (
          <>
            <div
              style={{
                flex: "1 1 auto",
                minHeight: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <VerticalFader
                value={activeFaderPosition}
                height="100%"
                width={DCA_FADER_TRACK_WIDTH}
                disabled={disabled || !activeActive}
                snapPoints={DCA_FADER_SNAP_POINTS}
                snapThreshold={2}
                zeroMarkerValue={dcaDbToPosition(0)}
                dragFromThumbOnly
                thumbIndicatorColor={resolvedAccentColor}
                onChange={(value) => onFaderChange?.(value)}
              />
            </div>
            <div
              style={{
                width: "100%",
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--surface-overlay-strong)",
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 400,
                fontVariantNumeric: "tabular-nums",
                color: "var(--text-primary)",
                fontFamily: "Inter, system-ui, sans-serif",
                lineHeight: 1,
                whiteSpace: "nowrap",
                boxSizing: "border-box",
                padding: "8px 4px",
              }}
            >
              {dcaFaderLabel(dcaPositionToDb(activeFaderPosition))}
            </div>
          </>
        ) : (
          <div
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
              padding: "8px 4px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                fontSize: 26,
                lineHeight: 1,
                fontWeight: 800,
                color: activeActive ? "var(--button-mute-text)" : "var(--text-secondary)",
              }}
            >
              {memberCount}
            </div>
            <div
              style={{
                fontSize: 10,
                lineHeight: "14px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: activeActive ? "var(--button-mute-text)" : "var(--text-tertiary)",
              }}
            >
              {activeActive ? "Muted" : "Ready"}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onDoubleClick={(e) => {
          if (disabled || !canOpenDetail) return;
          e.stopPropagation();
          onOpenDetail?.(groupId);
        }}
        onPointerDown={(e) => {
          if (disabled || !canOpenEditMenu) return;
          e.stopPropagation();
          footerLongPressTriggeredRef.current = false;
          clearFooterLongPress();
          footerLongPressTimerRef.current = window.setTimeout(() => {
            footerLongPressTriggeredRef.current = true;
            onOpenEditMenu?.(groupId);
          }, FOOTER_LONG_PRESS_MS);
        }}
        onPointerUp={() => {
          clearFooterLongPress();
        }}
        onPointerCancel={() => {
          clearFooterLongPress();
        }}
        onPointerLeave={() => {
          clearFooterLongPress();
        }}
        onClick={(e) => {
          if (!footerLongPressTriggeredRef.current) return;
          e.stopPropagation();
          footerLongPressTriggeredRef.current = false;
        }}
        disabled={disabled}
        title={canOpenDetail && canOpenEditMenu ? "Double click to open DCA Groups. Long press to edit." : canOpenDetail ? "Double click to open DCA Groups." : canOpenEditMenu ? "Long press to edit." : undefined}
        style={{
          width: "100%",
          height: "36px",
          background: resolvedAccentColor,
          padding: "3px 4px",
          border: "none",
          margin: 0,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "2px",
          textAlign: "left",
          alignItems: "flex-start",
          borderRadius: "0 0 4px 4px",
          minHeight: "36px",
          cursor: disabled ? "not-allowed" : canOpenEditMenu ? "pointer" : "default",
          fontFamily: "Inter, system-ui, sans-serif",
          opacity: disabled ? 0.58 : 1,
          filter: disabled ? "saturate(0.55) brightness(0.82)" : "none",
        }}
      >
        <span
          style={{
            width: "100%",
            fontSize: "10px",
            lineHeight: "11px",
            fontWeight: 600,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            color: "rgb(0 0 0 / 70%)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {footerLabel}
        </span>
        <span
          style={{
            width: "100%",
            fontSize: "14px",
            lineHeight: "16px",
            fontWeight: 700,
            color: "rgb(0 0 0 / 85%)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {groupName}
        </span>
      </button>
    </div>
  );
}