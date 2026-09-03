export const STALE_AFTER_DAYS = 90;

const DAY_MS = 86_400_000;

export function isoDate(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function daysSince(value: Date | string, now = new Date()): number {
  return Math.floor((now.getTime() - new Date(value).getTime()) / DAY_MS);
}

export type Freshness = { label: string; stale: boolean };

export function freshness(value: Date | string, now = new Date()): Freshness {
  const days = daysSince(value, now);
  const ago =
    days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
  return {
    label: `verified ${isoDate(value)} · ${ago}`,
    stale: days > STALE_AFTER_DAYS,
  };
}
