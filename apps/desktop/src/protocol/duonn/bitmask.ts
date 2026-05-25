export type GroupMember =
  | "CH_1"
  | "CH_2"
  | "CH_3"
  | "CH_4"
  | "CH_5"
  | "CH_6"
  | "CH_7"
  | "CH_8"
  | "CH_9"
  | "CH_10"
  | "CH_11"
  | "CH_12"
  | "CH_13"
  | "CH_14"
  | "CH_15"
  | "CH_16"
  | "CH_17"
  | "CH_18"
  | "CH_19"
  | "CH_20"
  | "CH_21"
  | "CH_22"
  | "CH_23"
  | "CH_24"
  | "CH_25"
  | "CH_26"
  | "CH_27"
  | "CH_28"
  | "CH_29"
  | "CH_30"
  | "CH_31"
  | "CH_32"
  | "FX_1"
  | "FX_2"
  | "FX_3"
  | "FX_4"
  | "AUX_1"
  | "AUX_2"
  | "AUX_3"
  | "AUX_4"
  | "AUX_5"
  | "AUX_6"
  | "AUX_7"
  | "AUX_8"
  | "AUX_9"
  | "AUX_10"
  | "AUX_11"
  | "AUX_12"
  | "AUX_13"
  | "AUX_14"
  | "MASTER_L"
  | "MASTER_R";

export type GroupMemberBit = {
  wordIndex: 0 | 1 | 2 | 3;
  bit: number;
  value: number;
  isConfirmed: boolean;
  note?: string;
};

export type BitmaskProtocolProfile = "ax16_24" | "ax32" | "ax32_experimental";

let ACTIVE_BITMASK_PROFILE: BitmaskProtocolProfile = "ax16_24";

export function setBitmaskProtocolProfile(profile: BitmaskProtocolProfile) {
  ACTIVE_BITMASK_PROFILE = profile === "ax32" ? "ax32_experimental" : profile;
}

const GROUP_MEMBER_BITS_AX16_24: Readonly<Record<GroupMember, GroupMemberBit | null>> = {
  CH_1: { wordIndex: 0, bit: 0, value: 1, isConfirmed: true },
  CH_2: { wordIndex: 0, bit: 1, value: 2, isConfirmed: true },
  CH_3: { wordIndex: 0, bit: 2, value: 4, isConfirmed: true },
  CH_4: { wordIndex: 0, bit: 3, value: 8, isConfirmed: true },
  CH_5: { wordIndex: 0, bit: 4, value: 16, isConfirmed: true },
  CH_6: { wordIndex: 0, bit: 5, value: 32, isConfirmed: true },
  CH_7: { wordIndex: 0, bit: 6, value: 64, isConfirmed: true },
  CH_8: { wordIndex: 0, bit: 7, value: 128, isConfirmed: true },
  CH_9: { wordIndex: 0, bit: 8, value: 256, isConfirmed: true },
  CH_10: { wordIndex: 0, bit: 9, value: 512, isConfirmed: true },
  CH_11: { wordIndex: 0, bit: 10, value: 1024, isConfirmed: true },
  CH_12: { wordIndex: 0, bit: 11, value: 2048, isConfirmed: true },
  CH_13: { wordIndex: 0, bit: 12, value: 4096, isConfirmed: true },
  CH_14: { wordIndex: 0, bit: 13, value: 8192, isConfirmed: true },
  CH_15: { wordIndex: 0, bit: 14, value: 16384, isConfirmed: true },
  CH_16: { wordIndex: 0, bit: 15, value: 32768, isConfirmed: true },
  CH_17: {
    wordIndex: 1,
    bit: 0,
    value: 1,
    isConfirmed: false,
    note: "Derived contiguous CH bit pattern for AX24 (CH17-CH24). Validate on hardware.",
  },
  CH_18: {
    wordIndex: 1,
    bit: 1,
    value: 2,
    isConfirmed: false,
    note: "Derived contiguous CH bit pattern for AX24 (CH17-CH24). Validate on hardware.",
  },
  CH_19: {
    wordIndex: 1,
    bit: 2,
    value: 4,
    isConfirmed: false,
    note: "Derived contiguous CH bit pattern for AX24 (CH17-CH24). Validate on hardware.",
  },
  CH_20: {
    wordIndex: 1,
    bit: 3,
    value: 8,
    isConfirmed: false,
    note: "Derived contiguous CH bit pattern for AX24 (CH17-CH24). Validate on hardware.",
  },
  CH_21: {
    wordIndex: 1,
    bit: 4,
    value: 16,
    isConfirmed: false,
    note: "Derived contiguous CH bit pattern for AX24 (CH17-CH24). Validate on hardware.",
  },
  CH_22: {
    wordIndex: 1,
    bit: 5,
    value: 32,
    isConfirmed: false,
    note: "Derived contiguous CH bit pattern for AX24 (CH17-CH24). Validate on hardware.",
  },
  CH_23: {
    wordIndex: 1,
    bit: 6,
    value: 64,
    isConfirmed: false,
    note: "Derived contiguous CH bit pattern for AX24 (CH17-CH24). Validate on hardware.",
  },
  CH_24: {
    wordIndex: 1,
    bit: 7,
    value: 128,
    isConfirmed: false,
    note: "Derived contiguous CH bit pattern for AX24 (CH17-CH24). Validate on hardware.",
  },
  CH_25: null,
  CH_26: null,
  CH_27: null,
  CH_28: null,
  CH_29: null,
  CH_30: null,
  CH_31: null,
  CH_32: null,
  FX_1: { wordIndex: 1, bit: 10, value: 1024, isConfirmed: true },
  FX_2: { wordIndex: 1, bit: 11, value: 2048, isConfirmed: true },
  FX_3: null,
  FX_4: null,
  AUX_1: { wordIndex: 1, bit: 12, value: 4096, isConfirmed: true },
  AUX_2: {
    wordIndex: 1,
    bit: 13,
    value: 8192,
    isConfirmed: false,
    note: "Derived contiguous AUX bit pattern between confirmed AUX_1 and AUX_8. Validate on hardware.",
  },
  AUX_3: {
    wordIndex: 1,
    bit: 14,
    value: 16384,
    isConfirmed: false,
    note: "Derived contiguous AUX bit pattern between confirmed AUX_1 and AUX_8. Validate on hardware.",
  },
  AUX_4: {
    wordIndex: 1,
    bit: 15,
    value: 32768,
    isConfirmed: false,
    note: "Derived contiguous AUX bit pattern between confirmed AUX_1 and AUX_8. Validate on hardware.",
  },
  AUX_5: {
    wordIndex: 2,
    bit: 0,
    value: 1,
    isConfirmed: false,
    note: "Derived contiguous AUX bit pattern between confirmed AUX_1 and AUX_8. Validate on hardware.",
  },
  AUX_6: {
    wordIndex: 2,
    bit: 1,
    value: 2,
    isConfirmed: false,
    note: "Derived contiguous AUX bit pattern between confirmed AUX_1 and AUX_8. Validate on hardware.",
  },
  AUX_7: {
    wordIndex: 2,
    bit: 2,
    value: 4,
    isConfirmed: false,
    note: "Derived contiguous AUX bit pattern between confirmed AUX_1 and AUX_8. Validate on hardware.",
  },
  AUX_8: { wordIndex: 2, bit: 3, value: 8, isConfirmed: true },
  AUX_9: null,
  AUX_10: null,
  AUX_11: null,
  AUX_12: null,
  AUX_13: null,
  AUX_14: null,
  MASTER_L: {
    wordIndex: 2,
    bit: 4,
    value: 16,
    isConfirmed: false,
    note: "Provisional: bit value is confirmed in aggregate, side assignment L/R still needs hardware validation.",
  },
  MASTER_R: {
    wordIndex: 2,
    bit: 5,
    value: 32,
    isConfirmed: false,
    note: "Provisional: bit value is confirmed in aggregate, side assignment L/R still needs hardware validation.",
  },
};

const GROUP_MEMBER_BITS_AX32: Readonly<Record<GroupMember, GroupMemberBit | null>> = {
  ...GROUP_MEMBER_BITS_AX16_24,
  CH_17: { wordIndex: 1, bit: 0, value: 1, isConfirmed: true },
  CH_18: { wordIndex: 1, bit: 1, value: 2, isConfirmed: true },
  CH_19: { wordIndex: 1, bit: 2, value: 4, isConfirmed: true },
  CH_20: { wordIndex: 1, bit: 3, value: 8, isConfirmed: true },
  CH_21: { wordIndex: 1, bit: 4, value: 16, isConfirmed: true },
  CH_22: { wordIndex: 1, bit: 5, value: 32, isConfirmed: true },
  CH_23: { wordIndex: 1, bit: 6, value: 64, isConfirmed: true },
  CH_24: { wordIndex: 1, bit: 7, value: 128, isConfirmed: true },
  CH_25: { wordIndex: 1, bit: 8, value: 256, isConfirmed: true },
  CH_26: { wordIndex: 1, bit: 9, value: 512, isConfirmed: true },
  CH_27: { wordIndex: 1, bit: 10, value: 1024, isConfirmed: true },
  CH_28: { wordIndex: 1, bit: 11, value: 2048, isConfirmed: true },
  CH_29: { wordIndex: 1, bit: 12, value: 4096, isConfirmed: true },
  CH_30: { wordIndex: 1, bit: 13, value: 8192, isConfirmed: true },
  CH_31: { wordIndex: 1, bit: 14, value: 16384, isConfirmed: true },
  CH_32: { wordIndex: 1, bit: 15, value: 32768, isConfirmed: true },
  FX_1: { wordIndex: 2, bit: 2, value: 4, isConfirmed: true },
  FX_2: { wordIndex: 2, bit: 3, value: 8, isConfirmed: true },
  FX_3: { wordIndex: 2, bit: 4, value: 16, isConfirmed: true },
  FX_4: { wordIndex: 2, bit: 5, value: 32, isConfirmed: true },
  AUX_1: { wordIndex: 2, bit: 6, value: 64, isConfirmed: true },
  AUX_2: { wordIndex: 2, bit: 7, value: 128, isConfirmed: true },
  AUX_3: { wordIndex: 2, bit: 8, value: 256, isConfirmed: true },
  AUX_4: { wordIndex: 2, bit: 9, value: 512, isConfirmed: true },
  AUX_5: { wordIndex: 2, bit: 10, value: 1024, isConfirmed: true },
  AUX_6: { wordIndex: 2, bit: 11, value: 2048, isConfirmed: true },
  AUX_7: { wordIndex: 2, bit: 12, value: 4096, isConfirmed: true },
  AUX_8: { wordIndex: 2, bit: 13, value: 8192, isConfirmed: true },
  AUX_9: { wordIndex: 2, bit: 14, value: 16384, isConfirmed: true },
  AUX_10: { wordIndex: 2, bit: 15, value: 32768, isConfirmed: true },
  AUX_11: { wordIndex: 3, bit: 0, value: 1, isConfirmed: true },
  AUX_12: { wordIndex: 3, bit: 1, value: 2, isConfirmed: true },
  AUX_13: { wordIndex: 3, bit: 2, value: 4, isConfirmed: true },
  AUX_14: { wordIndex: 3, bit: 3, value: 8, isConfirmed: true },
  MASTER_L: {
    wordIndex: 3,
    bit: 4,
    value: 16,
    isConfirmed: false,
    note: "Provisional AX32 mapping: MASTER bits placed after AUX_14. Validate on hardware.",
  },
  MASTER_R: {
    wordIndex: 3,
    bit: 5,
    value: 32,
    isConfirmed: false,
    note: "Provisional AX32 mapping: MASTER bits placed after AUX_14. Validate on hardware.",
  },
};

export const GROUP_MEMBER_BITS = GROUP_MEMBER_BITS_AX32;

function getActiveGroupMemberBits() {
  return ACTIVE_BITMASK_PROFILE === "ax32_experimental"
    ? GROUP_MEMBER_BITS_AX32
    : GROUP_MEMBER_BITS_AX16_24;
}

export function isMappedGroupMember(member: GroupMember) {
  return getActiveGroupMemberBits()[member] !== null;
}

export function setBit(wordValue: number, bit: number) {
  return (wordValue | (1 << bit)) >>> 0;
}

export function clearBit(wordValue: number, bit: number) {
  return (wordValue & ~(1 << bit)) >>> 0;
}

export function hasBit(wordValue: number, bit: number) {
  return ((wordValue >>> bit) & 1) === 1;
}

export function assertMappedGroupMember(member: GroupMember): asserts member is GroupMember {
  if (!getActiveGroupMemberBits()[member]) {
    throw new Error(`Unmapped group member ${member}. TODO(protocol): add confirmed DUONN bit mapping before encoding.`);
  }
}

export function getMemberBit(member: GroupMember) {
  assertMappedGroupMember(member);
  return getActiveGroupMemberBits()[member] as GroupMemberBit;
}

export function encodeGroupMembers(members: GroupMember[]): [number, number, number, number] {
  const words: [number, number, number, number] = [0, 0, 0, 0];

  for (const member of members) {
    const mapped = getMemberBit(member);
    words[mapped.wordIndex] = setBit(words[mapped.wordIndex], mapped.bit);
  }

  return words;
}

export function decodeGroupMembers(words: readonly [number, number, number, number]): GroupMember[] {
  const decoded: GroupMember[] = [];

  const entries = Object.entries(getActiveGroupMemberBits()) as Array<[GroupMember, GroupMemberBit | null]>;

  for (const [member, mapped] of entries) {
    if (!mapped) continue;
    if (hasBit(words[mapped.wordIndex], mapped.bit)) {
      decoded.push(member);
    }
  }

  return decoded;
}
