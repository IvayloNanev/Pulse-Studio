"use client";

import { useEffect, useState } from "react";

import { createOutreachRetry, resolveNoResponse } from "@/app/staff/actions";
import { StaffSubmitButton } from "@/components/staff-submit-button";

type RetentionFollowUpControlProps = {
  riskId: string;
  attemptNumber: number;
  cooldownUntil: string | null;
  canStartOutreach: boolean;
  blockedReason: string | null;
};

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function RetentionFollowUpControl({ riskId, attemptNumber, cooldownUntil, canStartOutreach, blockedReason }: RetentionFollowUpControlProps) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const initial = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  const deadline = cooldownUntil ? new Date(cooldownUntil) : null;
  const cooldownComplete = Boolean(now && deadline && deadline.getTime() <= now);

  return (
    <div className="mt-6 border-t border-black/10 pt-5">
      <h3 className="text-lg font-semibold">No response yet</h3>
      {deadline && !cooldownComplete ? <p className="mt-2 text-sm leading-6 text-black/65">The 14-day follow-up window opens {formatter.format(deadline)}.</p> : null}
      {blockedReason && attemptNumber < 3 && !canStartOutreach ? <p className="mt-2 text-sm font-medium text-[#8e211c]">{blockedReason}</p> : null}
      {attemptNumber < 3 && canStartOutreach ? (
        <form action={createOutreachRetry} className="mt-4 space-y-3">
          <input type="hidden" name="risk_assessment_id" value={riskId} />
          <label className="text-sm font-semibold" htmlFor="retry-message">Next outreach message</label>
          <textarea id="retry-message" name="message" required rows={4} defaultValue="Checking in again—we would be glad to help you find a class that fits your schedule." className="w-full rounded-xl border border-black/20 bg-white/60 p-3 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2" />
          <StaffSubmitButton pendingLabel="Preparing attempt…" tone="secondary">Prepare attempt {attemptNumber + 1}</StaffSubmitButton>
        </form>
      ) : null}
      {attemptNumber === 3 && cooldownComplete ? (
        <form action={resolveNoResponse} className="mt-4">
          <input type="hidden" name="risk_assessment_id" value={riskId} />
          <StaffSubmitButton pendingLabel="Resolving…" tone="secondary">Resolve—no response</StaffSubmitButton>
        </form>
      ) : null}
      {attemptNumber === 3 && !cooldownComplete ? <p className="mt-2 text-sm leading-6 text-black/65">After the final 14-day response window, this case can be resolved as no response.</p> : null}
    </div>
  );
}
