export function sessionManagementErrorMessage(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";
  if (/owner\/admin authorization|required|permission/i.test(message)) return "You do not have permission to manage this session.";
  if (/already cancelled/i.test(message)) return "This session is already cancelled.";
  if (/started or completed|can no longer/i.test(message)) return "This session can no longer be changed.";
  if (/conflicts with recorded attendance|attendance/i.test(message)) return "This action conflicts with recorded attendance.";
  if (/reason is required/i.test(message)) return "Enter a reason before cancelling this session.";
  return "Session could not be updated. Refresh and try again.";
}
