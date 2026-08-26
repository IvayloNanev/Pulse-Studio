import { newYorkDateParts, newYorkMidnight } from "@/lib/member-calendar";

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function newYorkDateKey(date: Date) {
  const { year, month, day } = newYorkDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function calendarDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function addCalendarDays(key: string, amount: number) {
  const date = calendarDate(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function newYorkWeekStart(requested: string | undefined, now: Date) {
  const fallback = newYorkDateKey(now);
  const requestedDate = requested && dateKeyPattern.test(requested) ? calendarDate(requested) : null;
  const requestedIsValid = requestedDate
    ? `${requestedDate.getUTCFullYear()}-${String(requestedDate.getUTCMonth() + 1).padStart(2, "0")}-${String(requestedDate.getUTCDate()).padStart(2, "0")}` === requested
    : false;
  const candidate = requestedIsValid ? requested as string : fallback;
  const day = calendarDate(candidate).getUTCDay();
  return addCalendarDays(candidate, -(day === 0 ? 6 : day - 1));
}

export function newYorkWeekDays(weekStart: string) {
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index));
}

export function newYorkWeekWindow(weekStart: string) {
  const start = calendarDate(weekStart);
  const endKey = addCalendarDays(weekStart, 7);
  const end = calendarDate(endKey);
  return {
    startsAt: newYorkMidnight(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()),
    endsAt: newYorkMidnight(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate()),
  };
}

export function calendarDateForFormatting(key: string) {
  return calendarDate(key);
}
