/** Logo / crest colors — use for backgrounds & chrome */
export const BRAND = {
  gold: "#FFD200",
  royalBlue: "#0054A6",
  skyBlue: "#00ADEF",
  navy: "#2E3192",
  deepNavy: "#1a1c5c",
  orange: "#F58220",
  lampTan: "#A67C52",
} as const;

/** Dashboard chart palette (user-selected) */
export const CHART = {
  mint: "#00E0BA",
  purple: "#91008D",
  pink: "#FF3483",
  yellow: "#FFCF00",
} as const;

/**
 * Data / chart / table palette — separate from logo colors.
 */
export const DATA = {
  pass: CHART.mint,
  fail: CHART.pink,
  male: CHART.purple,
  female: CHART.yellow,
  rate: CHART.mint,
  tableHeader: "#334155",
  tableHeaderText: "#F8FAFC",
  tableStripe: "rgba(15, 23, 42, 0.04)",
  tableHover: "rgba(0, 224, 186, 0.08)",
  accent: CHART.mint,
  muted: "#64748B",
  text: "#0F172A",
} as const;

export const GRADE_COLORS: Record<string, string> = {
  A: CHART.yellow,
  B: CHART.mint,
  C: CHART.purple,
  S: CHART.pink,
  W: "#6B0068", // deeper purple for fail/weak (from palette)
};

export const PASS_FAIL_COLORS = {
  pass: CHART.mint,
  fail: CHART.pink,
};

export const STAT_ACCENTS = {
  total: CHART.purple,
  pass: CHART.mint,
  fail: CHART.pink,
  average: CHART.yellow,
} as const;
