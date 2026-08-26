"use client";

import { useState } from "react";

export function StaffRetentionPreviewAction({ action, monitoring }: { action: string; monitoring: boolean }) {
  const [opened, setOpened] = useState(false);
  if (monitoring) return <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-950">No staff action is required. Continue monitoring future attendance evaluations.</div>;

  return (
    <div>
      <button type="button" onClick={() => setOpened((value) => !value)} aria-expanded={opened} className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#c72c25] px-5 text-sm font-semibold text-white transition hover:bg-[#a9231e] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 sm:w-auto">{opened ? "Close action workspace" : action}</button>
      {opened ? <div className="mt-4 rounded-2xl border border-black/10 bg-white/75 p-4" role="status"><p className="font-semibold">{action} workspace opened</p><p className="mt-2 text-sm leading-6 text-black/65">This is a safe local simulation. Review the evidence and checklist on this page; no status, note, or outreach record will be saved.</p></div> : null}
    </div>
  );
}
