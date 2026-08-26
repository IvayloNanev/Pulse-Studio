type AttendanceError = { message?: string } | null | undefined;

export function attendanceErrorMessage(error: AttendanceError) {
  const message = error?.message ?? "";
  if (/session access|required|active staff/i.test(message)) return "You don't have permission for this session.";
  if (/already been recorded|duplicate/i.test(message)) return "This reservation already has attendance recorded.";
  if (/not eligible|confirmed reservation|waitlist|reservation not found|class session not found/i.test(message)) return "One or more selected reservations are not eligible.";
  if (/cancelled session|outside|window|no-show|no_show|too early/i.test(message)) return "Attendance cannot be recorded for this session yet.";
  if (/correction.*change|reason is required/i.test(message)) return "Attendance correction is incomplete.";
  return "Attendance could not be updated. Try again.";
}
