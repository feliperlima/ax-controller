import type { GroupMember } from "../protocol/duonn/bitmask";
import { GROUP_MEMBER_BITS } from "../protocol/duonn/bitmask";

export type MemberDef = {
  id: GroupMember;
  label: string;
  isProvisional: boolean;
};

/** Members shown in the selector — only mapped members are listed. AUX 2–7 are excluded (no confirmed bit). */
export const AVAILABLE_GROUP_MEMBERS: MemberDef[] = [
  { id: "CH_1", label: "CH 1", isProvisional: false },
  { id: "CH_2", label: "CH 2", isProvisional: false },
  { id: "CH_3", label: "CH 3", isProvisional: false },
  { id: "CH_4", label: "CH 4", isProvisional: false },
  { id: "CH_5", label: "CH 5", isProvisional: false },
  { id: "CH_6", label: "CH 6", isProvisional: false },
  { id: "CH_7", label: "CH 7", isProvisional: false },
  { id: "CH_8", label: "CH 8", isProvisional: false },
  { id: "CH_9", label: "CH 9", isProvisional: false },
  { id: "CH_10", label: "CH 10", isProvisional: false },
  { id: "CH_11", label: "CH 11", isProvisional: false },
  { id: "CH_12", label: "CH 12", isProvisional: false },
  { id: "CH_13", label: "CH 13", isProvisional: false },
  { id: "CH_14", label: "CH 14", isProvisional: false },
  { id: "CH_15", label: "CH 15", isProvisional: false },
  { id: "CH_16", label: "CH 16", isProvisional: false },
  { id: "FX_1", label: "FX 1", isProvisional: false },
  { id: "FX_2", label: "FX 2", isProvisional: false },
  { id: "AUX_1", label: "AUX 1", isProvisional: false },
  { id: "AUX_8", label: "AUX 8", isProvisional: false },
  { id: "MASTER_L", label: "Mstr L", isProvisional: true },
  { id: "MASTER_R", label: "Mstr R", isProvisional: true },
];

/** Returns only mapped (non-null) members from AVAILABLE_GROUP_MEMBERS. */
export function getAvailableMembers(): MemberDef[] {
  return AVAILABLE_GROUP_MEMBERS.filter((m) => GROUP_MEMBER_BITS[m.id] !== null);
}

type GroupMemberSelectorProps = {
  selectedMembers: GroupMember[];
  accentColor?: string;
  disabled?: boolean;
  channelNames?: string[];
  onChange: (members: GroupMember[]) => void;
};

export function GroupMemberSelector({
  selectedMembers,
  accentColor = "var(--brand-duonn-cyan)",
  disabled = false,
  channelNames,
  onChange,
}: GroupMemberSelectorProps) {
  const available = getAvailableMembers();

  function toggleMember(id: GroupMember) {
    if (disabled) return;
    const isSelected = selectedMembers.includes(id);
    const next = isSelected
      ? selectedMembers.filter((m) => m !== id)
      : [...selectedMembers, id];
    onChange(next);
  }

  function getMemberLabel(def: MemberDef): string {
    if (channelNames && def.id.startsWith("CH_")) {
      const idx = parseInt(def.id.replace("CH_", ""), 10) - 1;
      if (channelNames[idx] && channelNames[idx].trim()) {
        return channelNames[idx].trim().slice(0, 8);
      }
    }
    return def.label;
  }

  return (
    <div className="group-member-selector">
      {available.map((def) => {
        const isSelected = selectedMembers.includes(def.id);
        return (
          <button
            key={def.id}
            type="button"
            disabled={disabled}
            title={
              def.isProvisional
                ? `${def.label} — provisional mapping, validate on hardware`
                : def.label
            }
            className={[
              "member-chip",
              isSelected ? "member-chip--selected" : "",
              def.isProvisional ? "member-chip--provisional" : "",
              disabled ? "member-chip--disabled" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              isSelected
                ? {
                    "--member-chip-accent": accentColor,
                  } as React.CSSProperties
                : undefined
            }
            onClick={() => toggleMember(def.id)}
          >
            <span className="member-chip__label">{getMemberLabel(def)}</span>
            {def.isProvisional && (
              <span className="member-chip__provisional-dot" aria-label="provisional" />
            )}
          </button>
        );
      })}
    </div>
  );
}
