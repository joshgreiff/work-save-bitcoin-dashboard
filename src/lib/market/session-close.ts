import { etCalendarDay, etFourPmIso, etMinutesSinceMidnight, etWeekday } from "./session";

/**
 * Stable 4:00 p.m. Eastern stamp matching existing data files
 * (e.g. 2026-09-21T16:00:00-04:00), not the UTC form of etFourPmIso.
 */
export function etFourPmOffsetStamp(calendarDay: string): string {
  const utcIso = etFourPmIso(calendarDay);
  const hourUtc = new Date(utcIso).getUTCHours();
  const offset = hourUtc === 21 ? "-05:00" : "-04:00";
  return `${calendarDay}T16:00:00${offset}`;
}

/** Previous weekday calendar day in America/New_York (skips Sat/Sun only). */
export function previousEtWeekday(calendarDay: string): string {
  let cursor = new Date(`${calendarDay}T18:00:00.000Z`);
  for (let i = 0; i < 10; i += 1) {
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
    const day = etCalendarDay(cursor);
    if (etWeekday(cursor) !== 0 && etWeekday(cursor) !== 6) {
      return day;
    }
  }
  throw new Error(`Could not find previous weekday before ${calendarDay}`);
}

/**
 * Latest equity session day that is eligible for an official close append.
 * Before 16:00 ET on a weekday, the prior weekday is used.
 */
export function latestCompletedEquitySessionDay(now: Date = new Date()): string {
  const today = etCalendarDay(now);
  const weekday = etWeekday(now);
  if (weekday === 0 || weekday === 6) {
    return previousEtWeekday(today);
  }
  if (etMinutesSinceMidnight(now) < 16 * 60) {
    return previousEtWeekday(today);
  }
  return today;
}

/** Inclusive weekday list from after `afterExclusive` through `throughInclusive`. */
export function etWeekdaysAfterThrough(
  afterExclusive: string,
  throughInclusive: string,
): string[] {
  const out: string[] = [];
  let cursor = new Date(`${afterExclusive}T18:00:00.000Z`);
  const end = new Date(`${throughInclusive}T18:00:00.000Z`);
  for (let i = 0; i < 40; i += 1) {
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    if (cursor.getTime() > end.getTime() + 12 * 60 * 60 * 1000) break;
    const day = etCalendarDay(cursor);
    if (day > throughInclusive) break;
    if (day <= afterExclusive) continue;
    const wd = etWeekday(cursor);
    if (wd !== 0 && wd !== 6) out.push(day);
  }
  return out;
}
