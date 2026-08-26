import { createUnderbookingDecision, resolveUnderbookingDecision } from "@/app/staff/actions";

type Decision = {
  decision_id: string;
  action: string;
  note: string | null;
  state: "open" | "resolved";
  created_at: string;
};

export function UnderbookingDecisionForm({
  sessionId,
  openDecision,
  resolvedDecisions,
  canManage,
  warning,
}: {
  sessionId: string;
  openDecision?: Decision;
  resolvedDecisions: Decision[];
  canManage: boolean;
  warning: boolean;
}) {
  return (
    <div className="grid gap-3">
      {openDecision ? (
        <div className="rounded-2xl border border-black/10 bg-white/55 p-4 text-sm">
          <p className="font-semibold capitalize">{openDecision.action.replaceAll("_", " ")}</p>
          {openDecision.note ? <p className="mt-1 text-black/65">{openDecision.note}</p> : null}
          <p className="mt-2 text-xs text-black/55">Open operational decision</p>
          {canManage ? (
          <form action={resolveUnderbookingDecision} className="mt-3">
            <input type="hidden" name="class_session_id" value={sessionId} />
            <input type="hidden" name="decision_id" value={openDecision.decision_id} />
            <button className="min-h-11 rounded-full border border-black px-4 text-xs font-semibold" type="submit">
              Resolve decision
            </button>
          </form>
          ) : null}
        </div>
      ) : null}
      {resolvedDecisions.length ? (
        <div className="rounded-2xl border border-black/10 bg-white/40 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/55">Resolved decision history</p>
          <div className="mt-2 space-y-2">
            {resolvedDecisions.map((decision) => (
              <div key={decision.decision_id} className="border-t border-black/10 pt-2 first:border-0 first:pt-0">
                <p className="font-semibold capitalize">{decision.action.replaceAll("_", " ")}</p>
                {decision.note ? <p className="mt-1 text-black/65">{decision.note}</p> : null}
                <p className="mt-1 text-xs text-black/55">Resolved historical decision</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {warning && canManage && !openDecision ? (
        <form action={createUnderbookingDecision} className="grid gap-3 rounded-2xl border border-[#c72c25]/25 bg-[#c72c25]/6 p-4">
          <input type="hidden" name="class_session_id" value={sessionId} />
          <label className="grid gap-1 text-xs font-semibold">
            Operational response
            <select name="action" required className="min-h-11 rounded-xl border border-black/20 bg-white px-3 text-sm">
              <option value="monitor">Monitor</option>
              <option value="promote_class">Promote class</option>
              <option value="adjust_operations">Adjust operations</option>
              <option value="review_for_cancellation">Review for cancellation</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            Optional note
            <textarea name="note" maxLength={1000} rows={2} className="rounded-xl border border-black/20 bg-white px-3 py-2 text-sm" />
          </label>
          <button type="submit" className="min-h-11 rounded-full bg-black px-4 text-xs font-semibold text-white hover:bg-[#c72c25]">
            Save decision
          </button>
        </form>
      ) : null}
    </div>
  );
}
