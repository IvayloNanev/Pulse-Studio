import { correctAttendance } from "@/app/staff/actions";

export function StaffAttendanceCorrection({ sessionId, attendanceRecordId, currentStatus }: { sessionId: string; attendanceRecordId: string; currentStatus: "attended" | "no_show" }) {
  const replacement = currentStatus === "attended" ? "no_show" : "attended";
  return (
    <details className="mt-3 rounded-2xl border border-black/10 bg-white/45 p-3">
      <summary className="cursor-pointer text-sm font-semibold">Correct attendance</summary>
      <form action={correctAttendance} className="mt-3 space-y-3">
        <input type="hidden" name="class_session_id" value={sessionId} />
        <input type="hidden" name="attendance_record_id" value={attendanceRecordId} />
        <input type="hidden" name="new_status" value={replacement} />
        <p className="text-sm">Change <strong>{currentStatus.replace("_", "-")}</strong> to <strong>{replacement.replace("_", "-")}</strong>.</p>
        <label className="block text-sm font-semibold">Correction reason<input required name="reason" maxLength={1000} className="mt-1 min-h-11 w-full rounded-xl border border-black/15 bg-white/70 px-3 font-normal" /></label>
        <button type="submit" className="min-h-11 rounded-full border border-[#c72c25] px-4 text-sm font-semibold text-[#a9231e]">Save correction with audit history</button>
      </form>
    </details>
  );
}
