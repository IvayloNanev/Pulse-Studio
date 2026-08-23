import Link from "next/link";

import type { MemberDashboardSummary } from "@/components/member-dashboard";
import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";
import { memberLinks } from "@/lib/member-navigation";

const dateFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" });

export default async function MemberAccountPage() {
  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc("member_dashboard", { p_as_of: new Date().toISOString() });
  const summary = data?.[0] as MemberDashboardSummary | undefined;
  return <PortalShell audience="member" eyebrow="Member portal" title="Account" description="Membership and account information." links={memberLinks} showHeader={false}>{error || !summary ? <div role="alert" className="rounded-3xl border border-[#c72c25]/30 bg-white/65 p-6 text-[#8e211c]">Your account information is temporarily unavailable.</div> : <><header className="rounded-3xl bg-[#171717] p-6 text-white"><p className="font-mono text-xs uppercase tracking-[0.16em] text-white/65">Account information</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">{summary.member_name}</h1><p className="mt-2 text-sm capitalize text-white/70">{summary.membership_status} member</p></header><section className="mt-4 grid gap-4 lg:grid-cols-2"><div className="rounded-3xl border border-black/10 bg-white/65 p-5"><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Membership</p><h2 className="mt-3 text-2xl font-semibold">{summary.plan_name}</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-black/60">Monthly allowance</dt><dd className="font-semibold">{summary.classes_per_month} classes</dd></div><div className="flex justify-between gap-4"><dt className="text-black/60">Current cycle ends</dt><dd className="font-semibold">{dateFormatter.format(new Date(summary.billing_cycle_end_at))}</dd></div><div className="flex justify-between gap-4"><dt className="text-black/60">Available credits</dt><dd className="font-semibold">{summary.classes_remaining}</dd></div></dl></div><div className="rounded-3xl border border-black/10 bg-[#eee6dc] p-5"><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Account support</p><h2 className="mt-3 text-2xl font-semibold">Need help?</h2><p className="mt-2 text-sm leading-6 text-black/65">Pulse Assistant can explain approved membership, pause, booking, and cancellation policies.</p><Link href="/member?assistant=open" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Ask Pulse Assistant</Link></div></section></>}</PortalShell>;
}
