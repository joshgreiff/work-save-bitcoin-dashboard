const NY_TZ = "America/New_York";

/** Format a Date as YYYY-MM-DD in America/New_York. */
export function etCalendarDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Minutes since local midnight in America/New_York. */
export function etMinutesSinceMidnight(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function etWeekday(date: Date = new Date()): number {
  // 0 = Sunday … 6 = Saturday in America/New_York
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[day] ?? 0;
}

/**
 * Regular U.S. equity session: Mon–Fri 09:30–16:00 America/New_York.
 * Does not account for market holidays (callers should use stored closes).
 */
export function isRegularEquitySession(date: Date = new Date()): boolean {
  const weekday = etWeekday(date);
  if (weekday === 0 || weekday === 6) return false;
  const minutes = etMinutesSinceMidnight(date);
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

/** Build an ISO timestamp for 16:00 America/New_York on a calendar day. */
export function etFourPmIso(calendarDay: string): string {
  // Use noon UTC probe to resolve EDT vs EST offset for that calendar day.
  const probe = new Date(`${calendarDay}T16:00:00Z`);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    timeZoneName: "longOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  // Find the UTC instant whose NY local time is 16:00:00 on calendarDay.
  for (let hourUtc = 18; hourUtc <= 22; hourUtc += 1) {
    const candidate = new Date(`${calendarDay}T${String(hourUtc).padStart(2, "0")}:00:00.000Z`);
    const parts = fmt.formatToParts(candidate);
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    const localDay = `${get("year")}-${get("month")}-${get("day")}`;
    const localHour = Number(get("hour"));
    const localMinute = Number(get("minute"));
    if (localDay === calendarDay && localHour === 16 && localMinute === 0) {
      return candidate.toISOString();
    }
  }
  // Fallback: Eastern daylight / standard common offsets
  void probe;
  return `${calendarDay}T16:00:00-04:00`;
}

export function formatEtTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  return formatViewerTimestamp(iso);
}

/**
 * Viewer-facing Eastern timestamp, e.g. "Sep. 26, 2026 at 11:35 a.m. ET".
 * Never return raw ISO strings from this helper.
 */
export function formatViewerTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const month = `${get("month")}.`;
  const day = get("day");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  const dayPeriod = get("dayPeriod").toLowerCase().replace(/^am$/, "a.m.").replace(/^pm$/, "p.m.");

  return `${month} ${day}, ${year} at ${hour}:${minute} ${dayPeriod} ET`;
}

/** Date-only Eastern calendar label, e.g. "Sep. 24, 2026". */
export function formatViewerDate(isoDateOrDateTime: string | null | undefined): string {
  if (!isoDateOrDateTime) return "—";
  const normalized =
    /^\d{4}-\d{2}-\d{2}$/.test(isoDateOrDateTime)
      ? `${isoDateOrDateTime}T12:00:00-04:00`
      : isoDateOrDateTime;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")}. ${get("day")}, ${get("year")}`;
}

export { NY_TZ };
