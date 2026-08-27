import Link from "next/link";
import { completeRetentionFollowUp } from "@/app/staff/actions";
import { PortalShell } from "@/components/portal-shell";
import { StaffSubmitButton } from "@/components/staff-submit-button";
import { requireStaff } from "@/lib/auth";
import { staffLinks } from "@/lib/staff-navigation";

type Member = { risk_assessment_id: string; member_name: string; risk_level: "high" | "medium"; previous_visits: number; current_visits: number; decline_percentage: number; last_attended_at: string | null };
type Detail = { email: string; phone: string | null };

function Profile({ member, detail }: { member: Member; detail?: Detail }) {
  const first = member.member_name.split(" ")[0] ?? member.member_name;
  const email = `Hi ${first},\n\nWe’ve missed seeing you at Pulse Studio. We noticed your visits have dropped recently and would love to help you find a class that works for you. Would you like us to recommend a session?\n\nWarmly,\nPulse Studio`;
  const text = `Hi ${first}! We’ve missed seeing you at Pulse Studio. Your visits have dropped recently—would you like us to recommend a class that works for you?`;
  const emailHref = detail?.email ? `mailto:${detail.email}?subject=${encodeURIComponent("A class recommendation from Pulse Studio")}&body=${encodeURIComponent(email)}` : undefined;
  const textHref = detail?.phone ? `sms:${detail.phone}?body=${encodeURIComponent(text)}` : undefined;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] border border-white/80 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-5 bg-[#171717] px-6 py-5 text-white">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#ff776f]">Follow up</p>
            <h2 className="mt-2 text-2xl font-semibold">{member.member_name}</h2>
            <p className="mt-1 text-sm text-white/70">Visits fell from {member.previous_visits} to {member.current_visits} in the last 30 days (−{member.decline_percentage}%).</p>
          </div>
          <Link href="/staff/retention" aria-label="Close follow-up" className="shrink-0 text-sm font-semibold text-white/75 transition hover:text-white">Close ×</Link>
        </header>
        <form action={completeRetentionFollowUp} className="p-5 sm:p-6">
          <input type="hidden" name="risk_assessment_id" value={member.risk_assessment_id} />
          <p className="text-sm text-black/60">Choose a prepared message, add an optional note, then mark the follow-up complete.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <section className="rounded-2xl border border-[#eadfd8] bg-[#faf7f3] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a9231e]">Email ready</p>
              <p className="mt-2 text-sm leading-5 text-black/70">Hi {first}, we’ve missed seeing you at Pulse Studio. Would you like help finding a class that fits your schedule?</p>
              {emailHref ? <a href={emailHref} className="mt-4 inline-flex rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white">Open email</a> : <p className="mt-4 text-sm text-black/50">No email address on file.</p>}
            </section>
            <section className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6e47c8]">Text ready</p>
              <p className="mt-2 text-sm leading-5 text-black/70">Hi {first}! We’ve missed you. Would you like us to recommend a class that works for you?</p>
              {textHref ? <a href={textHref} className="mt-4 inline-flex rounded-xl border border-black/15 px-4 py-2 text-sm font-semibold transition hover:bg-black hover:text-white">Open text</a> : <p className="mt-4 text-sm text-black/50">No mobile number on file.</p>}
            </section>
          </div>
          <label className="mt-5 block text-sm font-semibold">Private staff note <span className="font-normal text-black/55">(optional)</span><textarea name="body" rows={2} placeholder="Add context for the next staff member…" className="mt-2 w-full rounded-xl border border-black/20 p-3 font-normal" /></label>
          <div className="mt-4 flex justify-end"><StaffSubmitButton pendingLabel="Completing…" className="bg-emerald-700 hover:bg-emerald-800">✓ Mark complete</StaffSubmitButton></div>
        </form>
      </section>
    </div>
  );
}

export default async function RetentionPage({ searchParams }: { searchParams: Promise<{ member?: string; completed?: string }> }) {
  const params = await searchParams; const { supabase } = await requireStaff(); const { data, error } = await supabase.rpc("product_d_risk_queue"); const members = ((data ?? []) as Member[]).sort((a, b) => b.decline_percentage - a.decline_percentage); const selected = members.find((item) => item.risk_assessment_id === params.member); let detail: Detail | undefined; if (selected) { const { data } = await supabase.rpc("product_d_member_detail", { p_risk_assessment_id: selected.risk_assessment_id }); detail = (Array.isArray(data) ? data[0] : data) as Detail | undefined; }
  return <PortalShell audience="staff" eyebrow="Staff portal · Product D" title="Member retention" description="Keep an eye on attendance changes and reach out at the right moment." links={staffLinks} showHeader={false}><header className="staff-control-hero staff-control-hero-connected"><p className="font-mono text-xs uppercase tracking-[0.16em] text-[#ff776f]">Member care</p><h1 className="route-title mt-4 text-5xl">Member retention</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Review members whose visits have dropped, then reach out with context.</p></header>{error ? <div className="p-6 text-[#8e211c]">The at-risk member list is temporarily unavailable.</div> : <section className="rounded-b-[2rem] border border-t-0 border-white/90 bg-white/90 p-5 sm:p-7"><h2 className="text-2xl font-semibold">Who needs a personal follow-up?</h2><div className="mt-5 divide-y divide-black/10">{members.map((item) => { const complete = params.completed === item.risk_assessment_id; return <Link key={item.risk_assessment_id} href={`/staff/retention?member=${encodeURIComponent(item.risk_assessment_id)}`} className={`grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_8rem_7rem_auto] sm:items-center ${complete ? "bg-emerald-50" : "hover:bg-[#fff0eb]"}`}><div><p className={`font-semibold ${complete ? "text-emerald-700" : ""}`}>{item.member_name}</p><p className="text-sm text-black/60">{item.last_attended_at ? `Last attended ${new Date(item.last_attended_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "No recent attendance"}</p></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${complete ? "bg-emerald-600 text-white" : item.risk_level === "high" ? "bg-[#c72c25] text-white" : "bg-amber-100"}`}>{complete ? "Completed" : `${item.risk_level} risk`}</span><p className={complete ? "font-semibold text-emerald-700" : "font-semibold text-[#a9231e]"}>{complete ? "Done" : `−${item.decline_percentage}%`}</p><span className="text-sm font-semibold">View →</span></Link>; })}</div></section>}{selected ? <Profile member={selected} detail={detail} /> : null}</PortalShell>;
}
