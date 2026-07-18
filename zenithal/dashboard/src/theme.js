// Zenithal v2 design tokens — shared across Landing/Login/Dashboard so the
// whole app reads as one consistent, designed product instead of three
// pages that happen to sit next to each other.
export const font = {
  display: "'Syne', sans-serif",
  body: "'Sora', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

export const color = {
  bg: "#09090F",
  text: "#EDEBFF",
  textDim: "rgba(237,235,255,.6)",
  textFaint: "rgba(237,235,255,.4)",
  purple: "#8A7CFF",
  purpleLight: "#B9AFFF",
  pink: "#F056C7",
  pinkLight: "#F79BDC",
  violet: "#B23BD6",
  cyan: "#5EEAD4",
  red: "#FF5C7A",
  redLight: "#FF8CA3",
  orange: "#FFB454",
  orangeLight: "#FFC985",
  panelBg: "rgba(16,15,28,.6)",
  panelBorder: "rgba(255,255,255,.08)",
};

export const gradients = {
  brand: "linear-gradient(135deg,#8A7CFF,#F056C7)",
  brandButton: "linear-gradient(135deg,#B23BD6,#F056C7)",
  heading: "linear-gradient(180deg,#FFFFFF 30%,#C9C2FF 100%)",
  stat: "linear-gradient(135deg,#B9AFFF,#F056C7)",
};

export function verdictChip(v) {
  if (v === "MALICIOUS") return { bg: "rgba(255,92,122,.1)", fg: "#FF8CA3", bd: "rgba(255,92,122,.3)" };
  if (v === "SUSPICIOUS") return { bg: "rgba(255,180,84,.08)", fg: "#FFC985", bd: "rgba(255,180,84,.28)" };
  return { bg: "rgba(94,234,212,.07)", fg: "#5EEAD4", bd: "rgba(94,234,212,.22)" };
}

export const glass = {
  borderRadius: 18,
  border: `1px solid ${color.panelBorder}`,
  background: color.panelBg,
  backdropFilter: "blur(18px)",
};
