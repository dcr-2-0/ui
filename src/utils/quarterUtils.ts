/** Returns the current date. */
export function getEffectiveDate(): Date {
  return new Date();
}

/** Compute quarter string from a given date, e.g. 'Q1-2026'. */
export function computeQuarterFromDate(date: Date): string {
  const q = Math.ceil((date.getMonth() + 1) / 3);
  return `Q${q}-${date.getFullYear()}`;
}

/** Compute current quarter from the calendar (respects dcr-dev-date). */
export function computeCurrentCalendarQuarter(): string {
  return computeQuarterFromDate(getEffectiveDate());
}

/** Advance one quarter: 'Q1-2026' → 'Q2-2026', 'Q4-2025' → 'Q1-2026'. */
export function nextQuarter(quarter: string): string {
  const parts = quarter.split('-');
  let q = parseInt(parts[0].slice(1));
  let year = parseInt(parts[1]);
  q++;
  if (q > 4) { q = 1; year++; }
  return `Q${q}-${year}`;
}
