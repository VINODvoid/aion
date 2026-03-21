// Timezone utilities used across the API and queue workers.
// ALL streak and EOD calculations must go through these functions —
// never use 'new Date()' directly when comparing against a user's local day.

// Returns the current date string (YYYY-MM-DD) in the given timezone.
// Used by the EOD scheduler to determine if a user has missed a check-in today.
export function getTodayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Converts a UTC Date to a YYYY-MM-DD string in the user's timezone.
// Used when comparing check-in dates against the user's local calendar day.
export function toLocalDateString(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Checks if two dates fall on the same calendar day in the given timezone.
// Used by streak logic to determine if consecutive days were checked in.
export function isSameDay(a: Date, b: Date, timezone: string): boolean {
  return toLocalDateString(a, timezone) === toLocalDateString(b, timezone);
}

// Checks if a date is yesterday relative to now, in the given timezone.
// Used by streak logic — a check-in on "yesterday" keeps the streak alive.
export function isYesterday(date: Date, timezone: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday, timezone);
}
