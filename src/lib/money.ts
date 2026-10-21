export const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export const sumBy = <T>(items: T[] | undefined, pick: (x: T) => number): number =>
  (items ?? []).reduce((t, x) => t + num(pick(x)), 0);

export const safeDiv = (a: number, b: number): number => (b === 0 || !Number.isFinite(b) ? 0 : a / b);

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export const fmt = (n: number): string => nf.format(Math.round(num(n)));
export const fmt2 = (n: number): string => nf2.format(num(n));
export const pct = (x: number): string => `${(num(x) * 100).toFixed(1)}%`;
/** الهامش = البسط ÷ المقام، ويظهر "—" عند غياب الإيراد بدل رقم مضلل */
export const marginText = (part: number, whole: number): string => (num(whole) === 0 ? "—" : pct(num(part) / num(whole)));
export const compact = (n: number): string =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(num(n));

export const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
