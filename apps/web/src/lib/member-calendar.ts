import type { MemberCalendarDay } from "@/components/member-dashboard";

const newYorkParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partsOf(date: Date) {
  const parts = newYorkParts.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

function newYorkMidnight(year: number, month: number, day: number) {
  const wallTime = Date.UTC(year, month - 1, day);
  let instant = wallTime;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = partsOf(new Date(instant));
    const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    instant = wallTime - (representedAsUtc - instant);
  }
  return new Date(instant);
}

export function newYorkCalendarDays(now: Date, count: number): MemberCalendarDay[] {
  const today = partsOf(now);
  return Array.from({ length: count }, (_, index) => {
    const localDate = new Date(Date.UTC(today.year, today.month - 1, today.day + index, 12));
    const year = localDate.getUTCFullYear();
    const month = localDate.getUTCMonth() + 1;
    const day = localDate.getUTCDate();
    return {
      key: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      starts_at: newYorkMidnight(year, month, day).toISOString(),
    };
  });
}
