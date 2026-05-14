// AX Control System Tokens
// Generated from Figma variables

export const axTokens = {
  "primitive": {
    "neutral": {
      "0": "#FFFFFF",
      "50": "#F8FAFC",
      "100": "#F1F5F9",
      "200": "#E2E8F0",
      "300": "#CBD5E1",
      "400": "#94A3B8",
      "500": "#64748B",
      "600": "#475569",
      "700": "#334155",
      "800": "#1E293B",
      "900": "#0F172A",
      "950": "#020617",
      "1000": "#00040A"
    },
    "cyan": {
      "50": "#ECFEFF",
      "100": "#CFFAFE",
      "200": "#A5F3FC",
      "300": "#67E8F9",
      "400": "#35C3DF",
      "500": "#19A9CC",
      "600": "#0E8DAE",
      "700": "#0F6F89",
      "800": "#11576D",
      "900": "#0B3A4A"
    },
    "blue": {
      "50": "#EFF6FF",
      "100": "#DBEAFE",
      "200": "#BFDBFE",
      "300": "#93C5FD",
      "400": "#60A5FA",
      "500": "#3B82F6",
      "600": "#2563EB",
      "700": "#1D4ED8",
      "800": "#1E40AF",
      "900": "#1E3A8A"
    },
    "green": {
      "50": "#F0FDF4",
      "100": "#DCFCE7",
      "200": "#BBF7D0",
      "300": "#86EFAC",
      "400": "#4ADE80",
      "500": "#22C55E",
      "600": "#16A34A",
      "700": "#15803D",
      "800": "#166534",
      "900": "#14532D"
    },
    "amber": {
      "50": "#FFFBEB",
      "100": "#FEF3C7",
      "200": "#FDE68A",
      "300": "#FCD34D",
      "400": "#FBBF24",
      "500": "#EAB308",
      "600": "#CA8A04",
      "700": "#A16207",
      "800": "#854D0E",
      "900": "#713F12"
    },
    "orange": {
      "50": "#FFF7ED",
      "100": "#FFEDD5",
      "200": "#FED7AA",
      "300": "#FDBA74",
      "400": "#FB923C",
      "500": "#F97316",
      "600": "#EA580C",
      "700": "#C2410C",
      "800": "#9A3412",
      "900": "#7C2D12"
    },
    "red": {
      "50": "#FEF2F2",
      "100": "#FEE2E2",
      "200": "#FECACA",
      "300": "#FCA5A5",
      "400": "#F87171",
      "500": "#EF4444",
      "600": "#DC2626",
      "700": "#B91C1C",
      "800": "#991B1B",
      "900": "#7F1D1D"
    },
    "purple": {
      "50": "#FAF5FF",
      "100": "#F3E8FF",
      "200": "#E9D5FF",
      "300": "#D8B4FE",
      "400": "#C084FC",
      "500": "#A855F7",
      "600": "#9333EA",
      "700": "#7E22CE",
      "800": "#6B21A8",
      "900": "#581C87"
    }
  },
  "alpha": {
    "slate": {
      "12": "rgba(148, 163, 184, 0.12)",
      "16": "rgba(148, 163, 184, 0.16)",
      "24": "rgba(148, 163, 184, 0.24)",
      "32": "rgba(148, 163, 184, 0.32)",
      "40": "rgba(148, 163, 184, 0.4)",
      "08": "rgba(148, 163, 184, 0.08)"
    },
    "cyan": {
      "12": "rgba(56, 189, 248, 0.12)",
      "16": "rgba(56, 189, 248, 0.16)",
      "24": "rgba(56, 189, 248, 0.24)",
      "40": "rgba(56, 189, 248, 0.4)",
      "55": "rgba(56, 189, 248, 0.55)"
    },
    "green": {
      "14": "rgba(34, 197, 94, 0.14)",
      "40": "rgba(34, 197, 94, 0.4)"
    },
    "amber": {
      "14": "rgba(234, 179, 8, 0.14)",
      "40": "rgba(234, 179, 8, 0.4)"
    },
    "orange": {
      "14": "rgba(249, 115, 22, 0.14)",
      "40": "rgba(249, 115, 22, 0.4)"
    },
    "red": {
      "16": "rgba(239, 68, 68, 0.16)",
      "40": "rgba(239, 68, 68, 0.4)",
      "60": "rgba(239, 68, 68, 0.6)"
    },
    "purple": {
      "16": "rgba(168, 85, 247, 0.16)",
      "40": "rgba(168, 85, 247, 0.4)"
    },
    "black": {
      "20": "rgba(0, 0, 0, 0.2)",
      "40": "rgba(0, 0, 0, 0.4)",
      "60": "rgba(0, 0, 0, 0.6)",
      "80": "rgba(0, 0, 0, 0.8)"
    }
  },
  "channel": {
    "10": "#F95361",
    "11": "#E80CE9",
    "12": "#C96626",
    "01": "#4174BE",
    "02": "#4F22E8",
    "03": "#13BEC4",
    "04": "#8BA52C",
    "05": "#0CBD42",
    "06": "#139EE6",
    "07": "#A514E8",
    "08": "#EBD93A",
    "09": "#ED004C"
  },
  "brand": {
    "primary": "var(--primitive-cyan-400)",
    "primaryHover": "var(--primitive-cyan-300)",
    "primaryPressed": "var(--primitive-cyan-500)",
    "duonnCyan": "var(--primitive-cyan-400)",
    "duonnCyanLight": "var(--primitive-cyan-200)",
    "duonnBlue": "var(--primitive-blue-500)",
    "dark": "var(--primitive-neutral-950)"
  },
  "semantic": {
    "accent": {
      "base": "var(--brand-primary)",
      "hover": "var(--brand-primary-hover)",
      "pressed": "var(--brand-primary-pressed)",
      "surface": "var(--alpha-cyan-16)",
      "border": "var(--alpha-cyan-40)"
    },
    "success": {
      "base": "var(--primitive-green-500)",
      "surface": "var(--alpha-green-14)",
      "border": "var(--alpha-green-40)"
    },
    "warning": {
      "base": "var(--primitive-amber-500)",
      "surface": "var(--alpha-amber-14)",
      "border": "var(--alpha-amber-40)"
    },
    "danger": {
      "base": "var(--primitive-red-500)",
      "surface": "var(--alpha-red-16)",
      "border": "var(--alpha-red-40)"
    },
    "phantom": {
      "base": "var(--primitive-purple-600)",
      "surface": "var(--alpha-purple-16)",
      "border": "var(--alpha-purple-40)"
    },
    "info": {
      "base": "var(--primitive-blue-500)",
      "surface": "var(--alpha-cyan-12)",
      "border": "var(--alpha-cyan-40)"
    }
  },
  "surface": {
    "app": "var(--primitive-neutral-950)",
    "header": "var(--primitive-neutral-1000)",
    "shell": "var(--primitive-neutral-950)",
    "panel": "var(--primitive-neutral-900)",
    "panelRaised": "var(--primitive-neutral-800)",
    "card": "var(--primitive-neutral-900)",
    "cardHover": "var(--primitive-neutral-800)",
    "cardActive": "var(--primitive-neutral-700)",
    "cardSelected": "var(--primitive-cyan-900)",
    "control": "var(--primitive-neutral-900)",
    "controlHover": "var(--primitive-neutral-800)",
    "controlActive": "var(--primitive-neutral-700)",
    "overlaySoft": "var(--alpha-black-40)",
    "overlayStrong": "var(--alpha-black-80)"
  },
  "text": {
    "primary": "var(--primitive-neutral-100)",
    "secondary": "var(--primitive-neutral-300)",
    "tertiary": "var(--primitive-neutral-400)",
    "muted": "var(--primitive-neutral-500)",
    "disabled": "var(--primitive-neutral-600)",
    "inverse": "var(--primitive-neutral-950)",
    "accent": "var(--semantic-accent-base)",
    "success": "var(--semantic-success-base)",
    "warning": "var(--semantic-warning-base)",
    "danger": "var(--semantic-danger-base)",
    "phantom": "var(--semantic-phantom-base)"
  },
  "border": {
    "subtle": "var(--alpha-slate-16)",
    "default": "var(--alpha-slate-24)",
    "strong": "var(--alpha-slate-40)",
    "focus": "var(--semantic-accent-base)",
    "selected": "var(--semantic-accent-base)",
    "success": "var(--semantic-success-border)",
    "warning": "var(--semantic-warning-border)",
    "danger": "var(--semantic-danger-border)",
    "phantom": "var(--semantic-phantom-border)"
  },
  "module": {
    "eQ": {
      "primary": "var(--semantic-accent-base)",
      "surface": "var(--semantic-accent-surface)",
      "border": "var(--semantic-accent-border)"
    },
    "gate": {
      "primary": "var(--semantic-success-base)",
      "surface": "var(--semantic-success-surface)",
      "border": "var(--semantic-success-border)"
    },
    "comp": {
      "primary": "var(--primitive-orange-500)",
      "surface": "var(--alpha-orange-14)",
      "border": "var(--alpha-orange-40)"
    },
    "filter": {
      "primary": "var(--semantic-info-base)",
      "surface": "var(--semantic-info-surface)",
      "border": "var(--semantic-info-border)"
    },
    "master": {
      "primary": "var(--semantic-danger-base)",
      "surface": "var(--semantic-danger-surface)",
      "border": "var(--semantic-danger-border)"
    },
    "fX": {
      "primary": "var(--primitive-purple-500)",
      "surface": "var(--semantic-phantom-surface)",
      "border": "var(--semantic-phantom-border)"
    }
  },
  "meter": {
    "background": "var(--surface-app)",
    "border": "var(--border-default)",
    "off": "var(--surface-control)",
    "green": "var(--semantic-success-base)",
    "yellow": "var(--semantic-warning-base)",
    "orange": "var(--primitive-orange-500)",
    "red": "var(--semantic-danger-base)",
    "peakMarker": "var(--text-primary)",
    "clip": "var(--semantic-danger-base)"
  },
  "fader": {
    "track": "var(--surface-app)",
    "trackBorder": "var(--border-subtle)",
    "rail": "var(--surface-control)",
    "railActive": "var(--semantic-accent-base)",
    "thumbTop": "var(--primitive-neutral-300)",
    "thumbMid": "var(--primitive-neutral-500)",
    "thumbBottom": "var(--primitive-neutral-700)",
    "thumbBorder": "var(--border-strong)",
    "thumbLine": "var(--text-primary)",
    "scale": "var(--border-default)",
    "scaleText": "var(--text-tertiary)"
  },
  "knob": {
    "bodyDark": "var(--surface-app)",
    "bodyMid": "var(--primitive-neutral-800)",
    "bodyLight": "var(--primitive-neutral-500)",
    "border": "var(--border-default)",
    "indicator": "var(--text-primary)",
    "arcBase": "var(--surface-control)",
    "arcActive": "var(--semantic-accent-base)",
    "arcGate": "var(--module-gate-primary)",
    "arcComp": "var(--module-comp-primary)",
    "arcEQ": "var(--module-eq-primary)",
    "label": "var(--text-tertiary)",
    "value": "var(--text-primary)"
  },
  "graph": {
    "background": "var(--surface-app)",
    "panel": "var(--surface-shell)",
    "border": "var(--border-default)",
    "gridMajor": "var(--alpha-slate-24)",
    "gridMinor": "var(--alpha-slate-12)",
    "gridZero": "var(--semantic-accent-border)",
    "axisText": "var(--text-tertiary)",
    "curveMain": "var(--text-primary)",
    "curveSecondary": "var(--text-secondary)",
    "fillEQ": "var(--module-eq-surface)",
    "fillGate": "var(--module-gate-surface)",
    "fillComp": "var(--module-comp-surface)",
    "handleText": "var(--text-primary)",
    "handleRing": "var(--border-strong)",
    "handleEQ": "var(--module-eq-primary)",
    "handleGate": "var(--module-gate-primary)",
    "handleComp": "var(--module-comp-primary)"
  },
  "button": {
    "default": {
      "bg": "var(--surface-control)",
      "bgHover": "var(--surface-control-hover)",
      "border": "var(--border-default)",
      "text": "var(--text-primary)"
    },
    "primary": {
      "bg": "var(--semantic-accent-base)",
      "bgHover": "var(--semantic-accent-hover)",
      "border": "var(--border-focus)",
      "text": "var(--text-inverse)"
    },
    "on": {
      "bg": "var(--semantic-success-surface)",
      "border": "var(--semantic-success-border)",
      "text": "var(--primitive-green-200)"
    },
    "off": {
      "bg": "var(--surface-control)",
      "border": "var(--border-default)",
      "text": "var(--text-tertiary)"
    },
    "mute": {
      "bg": "var(--semantic-danger-surface)",
      "border": "var(--semantic-danger-border)",
      "text": "var(--primitive-red-200)"
    },
    "solo": {
      "bg": "var(--semantic-warning-surface)",
      "border": "var(--semantic-warning-border)",
      "text": "var(--primitive-amber-200)"
    },
    "phantom": {
      "bg": "var(--semantic-phantom-surface)",
      "border": "var(--semantic-phantom-border)",
      "text": "var(--primitive-purple-200)"
    },
    "amber": {
      "bg": "var(--alpha-amber-14)",
      "border": "var(--alpha-amber-40)",
      "text": "var(--primitive-amber-200)"
    }
  },
  "spacing": {
    "0": "0",
    "1": "4",
    "2": "8",
    "3": "12",
    "4": "16",
    "5": "20",
    "6": "24",
    "8": "32",
    "10": "40",
    "12": "48"
  },
  "radius": {
    "xS": "4",
    "sM": "6",
    "mD": "8",
    "lG": "12",
    "xL": "16",
    "2XL": "20",
    "pill": "999"
  },
  "size": {
    "header": {
      "tablet": "64",
      "desktop": "72"
    },
    "statusBar": "40",
    "sidebar": {
      "tablet": "148",
      "desktop": "200"
    },
    "master": {
      "tablet": "148",
      "desktop": "180"
    },
    "touch": {
      "min": "44"
    },
    "button": {
      "compact": "36",
      "default": "44",
      "large": "52"
    },
    "knob": {
      "sM": "44",
      "mD": "52",
      "lG": "64"
    },
    "fader": {
      "thumbWidth": "32",
      "thumbHeight": "50"
    }
  },
  "stroke": {
    "thin": "1",
    "default": "1",
    "strong": "2",
    "focus": "2",
    "graph": "2",
    "meter": "1"
  },
  "opacity": {
    "disabled": "40",
    "muted": "60",
    "hover": "80",
    "full": "100"
  },
  "fontSize": {
    "heading": {
      "large": "22",
      "medium": "18",
      "small": "16"
    },
    "body": {
      "medium": "14",
      "small": "13"
    },
    "label": {
      "large": "13",
      "medium": "11",
      "small": "10"
    },
    "value": {
      "large": "18",
      "medium": "14",
      "small": "12"
    },
    "graph": {
      "axis": "12"
    }
  },
  "lineHeight": {
    "heading": {
      "large": "30",
      "medium": "26",
      "small": "22"
    },
    "body": {
      "medium": "20",
      "small": "18"
    },
    "label": {
      "large": "16",
      "medium": "14",
      "small": "12"
    },
    "value": {
      "large": "24",
      "medium": "18",
      "small": "16"
    },
    "graph": {
      "axis": "16"
    }
  },
  "fontWeight": {
    "regular": "400",
    "medium": "500",
    "semibold": "600",
    "bold": "700",
    "extraBold": "800"
  },
  "letterSpacing": {
    "label": {
      "large": "8",
      "medium": "10",
      "small": "12"
    }
  },
  "fontFamily": {
    "base": "Inter"
  },
  "product": {
    "name": "Ax Controller"
  },
  "designSystem": {
    "name": "AX Control System"
  }
} as const;

export type AxTokens = typeof axTokens;
