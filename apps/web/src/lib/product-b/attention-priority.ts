export type AttendanceAction = "attended" | "no_show";

export function sortAttendanceAttention<T extends { class_session_id: string; starts_at: string }>(
  sessions: T[],
  actionBySession: Map<string, AttendanceAction>,
) {
  const rank = (action: AttendanceAction | undefined) => action === "no_show" ? 0 : action === "attended" ? 1 : 2;

  return [...sessions].sort((left, right) =>
    rank(actionBySession.get(left.class_session_id)) - rank(actionBySession.get(right.class_session_id))
      || new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime(),
  );
}
