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

export function newYorkDateParts(date: Date) {
  const parts = newYorkParts.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

export function newYorkMidnight(year: number, month: number, day: number) {
  const wallTime = Date.UTC(year, month - 1, day);
  let instant = wallTime;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = newYorkDateParts(new Date(instant));
    const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    instant = wallTime - (representedAsUtc - instant);
  }
  return new Date(instant);
}

export function newYorkCalendarDays(now: Date, count: number): MemberCalendarDay[] {
  const today = newYorkDateParts(now);
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

export function newYorkMonthWindow(year: number, month: number) {
  const nextMonth = new Date(Date.UTC(year, month, 1, 12));
  return {
    startsAt: newYorkMidnight(year, month, 1),
    endsAt: newYorkMidnight(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 1),
  };
}

export function newYorkMonthDays(now: Date): MemberCalendarDay[] {
  const current = newYorkDateParts(now);
  const daysInMonth = new Date(Date.UTC(current.year, current.month, 0)).getUTCDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    return {
      key: `${current.year}-${String(current.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      starts_at: newYorkMidnight(current.year, current.month, day).toISOString(),
    };
  });
}
