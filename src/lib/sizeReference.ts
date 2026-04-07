// Centralized size reference configuration
// Used by HU forms, Planning Poker, cards, and badges

export interface SizeReference {
  key: string;
  label: string;
  points: number;
  hours: number;
  pointsLabel: string;
}
export const SIZE_REFERENCES: SizeReference[] = [
  { key: "P", label: "P", hours: 4 },
  { key: "M", label: "M", hours: 6 },
  { key: "G", label: "G", hours: 12 },
  { key: "GG", label: "GG", hours: 16 },
  { key: "XG", label: "XG", hours: 24 },
];

/*
export const SIZE_REFERENCES: SizeReference[] = [
  { key: "P",  label: "P",  points: 1,  hours: 4,  pointsLabel: "1–2 pts" },
  { key: "M",  label: "M",  points: 3,  hours: 6,  pointsLabel: "3 pts" },
  { key: "G",  label: "G",  points: 5,  hours: 12, pointsLabel: "5–8 pts" },
  { key: "GG", label: "GG", points: 13, hours: 16, pointsLabel: "13 pts" },
  { key: "XG", label: "XG", points: 21, hours: 24, pointsLabel: "21+ pts" },
];
*/

export function getSizeByKey(key: string | null | undefined): SizeReference | undefined {
  if (!key) return undefined;
  return SIZE_REFERENCES.find((s) => s.key === key);
}

export function getSizeByPoints(points: number): SizeReference | undefined {
  if (points <= 2) return SIZE_REFERENCES[0];
  if (points <= 4) return SIZE_REFERENCES[1];
  if (points <= 8) return SIZE_REFERENCES[2];
  if (points <= 13) return SIZE_REFERENCES[3];
  return SIZE_REFERENCES[4];
}

// Map fibonacci vote values to size references
export function mapVoteToSize(voteValue: string): SizeReference | undefined {
  const num = parseFloat(voteValue);
  if (isNaN(num)) return undefined;
  return getSizeByPoints(num);
}

// FIBONACCI deck
export const FIBONACCI_DECK = ["0", "½", "1", "2", "3", "5", "8", "13", "21", "40", "100", "∞", "☕"];

// Hours deck (default)
export const HOURS_DECK = SIZE_REFERENCES.map((s) => ({
  value: s.key,
  label: `${s.label} — ${s.hours}h`,
}));
