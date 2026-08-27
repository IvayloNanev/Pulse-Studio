"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { createRiskNote } from "@/app/staff/actions";
import { StaffSubmitButton } from "@/components/staff-submit-button";

type RetentionOutreachModalProps = {
  riskId: string;
  memberName: string;
  email?: string;
  phone?: string | null;
  doNotContact?: boolean;
  previousVisits?: number;
  currentVisits?: number;
  declinePercentage?: number;
  riskLevel?: "high" | "medium";
  status?: string;
  buttonLabel?: string;
  triggerClassName?: string;
  initiallyOpen?: boolean;
};

export function RetentionOutreachModal({ riskId, memberName, email, phone, doNotContact = false, previousVisits, currentVisits, declinePercentage, riskLevel, status, buttonLabel = "Contact member", triggerClassName, initiallyOpen = false }: RetentionOutreachModalProps) {
  const [channel, setChannel] = useState<"email" | "sms">(email ? "email" : "sms");
  const [portalReady, setPortalReady] = useState(false);
  const firstName = memberName.split(" ")[0] ?? memberName;
  const message = `Hi ${firstName}, we’ve missed seeing you at Pulse Studio. We noticed your class visits have dropped recently and would love to help you find a class that works for you. Would you like us to recommend a session?`;
  const contactHref = channel === "email"
    ? email ? `mailto:${email}?subject=${encodeURIComponent("A class recommendation from Pulse Studio")}&body=${encodeURIComponent(message)}` : undefined
    : phone ? `sms:${phone}?body=${encodeURIComponent(message)}` : undefined;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPortalReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return <>
    {/* Native links keep profile selection reliable even before client scripts hydrate. */}
    <a href={`/staff/retention?member=${encodeURIComponent(riskId)}`} className={triggerClassName ?? "inline-flex min-h-11 items-center justify-center rounded-full border border-black/15 bg-white px-4 text-sm font-semibold transition hover:border-[#c72c25] hover:text-[#a9231e] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"}>{buttonLabel}</a>
    {portalReady && initiallyOpen ? createPortal(<div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm" role="presentation">
      <section tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`outreach-${riskId}`} className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_2rem_5rem_rgba(0,0,0,0.28)] outline-none">
        <header className="flex items-start justify-between gap-4 bg-[#171717] p-5 text-white sm:p-7">
          <div><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#ff776f]">Member profile · retention</p><h2 id={`outreach-${riskId}`} className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{memberName}</h2><p className="mt-2 text-sm leading-6 text-white/70">Review their risk, prepare a personal message, and save a private staff note.</p></div>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/staff/retention" className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20">Close</a>
        </header>
        <div className="bg-white/95 p-5 sm:p-7">
          {previousVisits !== undefined && currentVisits !== undefined && declinePercentage !== undefined ? <section aria-label="Member risk summary" className="grid gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-[#fff0eb] p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8e211c]">Risk</p><p className="mt-1 text-xl font-semibold capitalize">{riskLevel ?? "at"} risk</p></div><div className="rounded-2xl bg-[#f7f6f2] p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/55">Previous</p><p className="mt-1 text-xl font-semibold">{previousVisits} visits</p></div><div className="rounded-2xl bg-[#f7f6f2] p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/55">Current</p><p className="mt-1 text-xl font-semibold">{currentVisits} visits</p></div><div className="rounded-2xl bg-[#fff0eb] p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8e211c]">Decline</p><p className="mt-1 text-xl font-semibold text-[#a9231e]">−{declinePercentage}%</p></div></section> : null}
          {status ? <p className="mt-4 text-sm text-black/60">Case status: <span className="font-semibold capitalize text-black">{status.replaceAll("_", " ")}</span></p> : null}
          {doNotContact ? <p className="rounded-2xl bg-[#c72c25]/10 p-4 text-sm font-semibold text-[#8e211c]">This member has asked not to be contacted. You can still add a private staff note below.</p> : <><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setChannel("email")} disabled={!email} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${channel === "email" ? "border-black bg-black text-white" : "border-black/15 bg-white"} disabled:cursor-not-allowed disabled:opacity-40`}>Email {email ? "· available" : "· unavailable"}</button><button type="button" onClick={() => setChannel("sms")} disabled={!phone} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${channel === "sms" ? "border-black bg-black text-white" : "border-black/15 bg-white"} disabled:cursor-not-allowed disabled:opacity-40`}>Text {phone ? "· available" : "· unavailable"}</button></div><div className="mt-4 rounded-2xl border border-black/10 bg-[#f7f6f2] p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/60">Prepared message</p><p className="mt-2 text-sm leading-6 text-black/75">{message}</p><a href={contactHref} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#c72c25]">Open {channel === "email" ? "email" : "text"} message</a></div></>}
          <form action={createRiskNote} className="mt-5 border-t border-black/10 pt-5"><input type="hidden" name="risk_assessment_id" value={riskId} /><input type="hidden" name="return_to" value="retention" /><label htmlFor={`outreach-note-${riskId}`} className="text-sm font-semibold">Private staff note</label><textarea id={`outreach-note-${riskId}`} name="body" required rows={3} placeholder="Add context for the next staff member…" className="mt-2 w-full rounded-2xl border border-black/20 bg-white p-3 text-sm focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2" /><div className="mt-3 flex justify-end"><StaffSubmitButton pendingLabel="Saving note…">Save note</StaffSubmitButton></div></form>
        </div>
      </section>
    </div>, document.body) : null}
  </>;
}
