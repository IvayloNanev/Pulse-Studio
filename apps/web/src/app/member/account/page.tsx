import Link from "next/link";
import { CreditCard, Mail, MessageCircle, Phone, UserRound } from "lucide-react";

import type { MemberDashboardSummary } from "@/components/member-dashboard";
import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";
import { memberLinks } from "@/lib/member-navigation";

const dateFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" });
const supportEmail = "support@pulsestudio.com";
const supportPhoneDisplay = "(212) 555-0198";
const supportPhoneHref = "+12125550198";

type MemberRecord = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  preferred_channel: "email" | "sms" | "phone";
};

type SimulatedPaymentMethod = {
  payment_method_id: string;
  cardholder_name: string;
  card_brand: "visa" | "mastercard" | "amex";
  last_four: string;
  expiration_month: number;
  expiration_year: number;
  is_default: boolean;
  status: "active" | "removed" | "expired";
};

export default async function MemberAccountPage() {
  const { supabase, memberId } = await requireMember();
  const [{ data: dashboardData, error: dashboardError }, { data: memberData, error: memberError }, { data: paymentData, error: paymentError }] = await Promise.all([
    supabase.rpc("member_dashboard", { p_as_of: new Date().toISOString() }),
    supabase.from("members").select("first_name,last_name,email,phone,preferred_channel").eq("member_id", memberId).single(),
    supabase.from("simulated_payment_methods").select("payment_method_id,cardholder_name,card_brand,last_four,expiration_month,expiration_year,is_default,status").eq("member_id", memberId).eq("status", "active").order("is_default", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const summary = dashboardData?.[0] as MemberDashboardSummary | undefined;
  const member = memberData as MemberRecord | null;
  const paymentMethod = paymentData as SimulatedPaymentMethod | null;
  const unavailable = dashboardError || memberError || !summary || !member;

  return <PortalShell audience="member" eyebrow="Member portal" title="Account" description="Membership and account information." links={memberLinks} showHeader={false}>
    {unavailable ? <div role="alert" className="rounded-3xl border border-black/15 bg-white/65 p-6 text-[#8e211c]">Your account information is temporarily unavailable.</div> : <>
      <header className="rounded-3xl bg-[#171717] p-6 text-white shadow-[0_1.5rem_4rem_rgba(17,17,17,0.18)]">
        <div className="flex items-start gap-4"><div className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/8"><UserRound className="size-6" aria-hidden="true" /></div><div><p className="route-eyebrow text-white/65">Account information</p><h1 className="route-title mt-2 text-3xl sm:text-4xl">{member.first_name} {member.last_name}</h1><p className="mt-2 text-sm capitalize text-white/70">{summary.membership_status} member · ID {memberId}</p></div></div>
      </header>

      <section className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-12 [&>article]:xl:col-span-6 [&>article:nth-child(3)]:xl:col-span-5 [&>article:nth-child(4)]:xl:col-span-7" aria-label="Account details">
        <article className="rounded-3xl border border-white/70 bg-white/68 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl sm:p-6"><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Personal details</p><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-black/60">Full name</dt><dd className="mt-1 font-semibold">{member.first_name} {member.last_name}</dd></div><div><dt className="text-black/60">Member ID</dt><dd className="mt-1 font-mono font-semibold">{memberId}</dd></div><div><dt className="text-black/60">Member status</dt><dd className="mt-1 capitalize font-semibold">{summary.membership_status}</dd></div></dl></article>

        <article className="rounded-3xl border border-white/70 bg-white/68 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl sm:p-6"><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Contact information</p><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-black/60">Email</dt><dd className="break-all font-semibold"><a href={`mailto:${member.email}`} className="inline-flex min-h-11 items-center rounded-lg pr-2 underline decoration-[#c72c25] decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">{member.email}</a></dd></div><div><dt className="text-black/60">Phone</dt><dd className="font-semibold">{member.phone ? <a href={`tel:${member.phone}`} className="inline-flex min-h-11 items-center rounded-lg pr-2 underline decoration-[#c72c25] decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">{member.phone}</a> : <span className="mt-1 inline-block">Not provided</span>}</dd></div><div><dt className="text-black/60">Preferred contact</dt><dd className="mt-1 capitalize font-semibold">{member.preferred_channel}</dd></div></dl></article>

        <article className="rounded-3xl border border-black/10 bg-[#eee6dc] p-5 sm:p-6"><CreditCard className="size-5 text-[#c72c25]" aria-hidden="true" /><p className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-black/60">Simulated payment method</p>{paymentError ? <div role="alert" className="mt-3 text-sm text-[#8e211c]">Your simulated payment method is temporarily unavailable.</div> : paymentMethod ? <><h2 className="mt-2 text-2xl font-semibold capitalize">{paymentMethod.card_brand} •••• {paymentMethod.last_four}</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-black/60">Cardholder</dt><dd className="text-right font-semibold">{paymentMethod.cardholder_name}</dd></div><div className="flex justify-between gap-4"><dt className="text-black/60">Expires</dt><dd className="font-semibold">{String(paymentMethod.expiration_month).padStart(2, "0")}/{paymentMethod.expiration_year}</dd></div><div className="flex justify-between gap-4"><dt className="text-black/60">Status</dt><dd className="font-semibold capitalize">{paymentMethod.is_default ? "Default · " : ""}{paymentMethod.status}</dd></div></dl><p className="mt-4 text-xs leading-5 text-black/55">Test data only. Pulse never stores a full card number or security code.</p></> : <><h2 className="mt-2 text-2xl font-semibold">No simulated method on file</h2><p className="mt-2 text-sm leading-6 text-black/65">Add a simulated payment method to support membership and drop-in workflows.</p></>}</article>

        <article className="rounded-3xl border border-black/10 bg-[#eee6dc] p-5 sm:p-6"><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Membership</p><h2 className="mt-3 text-2xl font-semibold">{summary.plan_name}</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-black/60">Monthly allowance</dt><dd className="font-semibold">{summary.classes_per_month} classes</dd></div><div className="flex justify-between gap-4"><dt className="text-black/60">Current cycle ends</dt><dd className="text-right font-semibold">{dateFormatter.format(new Date(summary.billing_cycle_end_at))}</dd></div><div className="flex justify-between gap-4"><dt className="text-black/60">Available credits</dt><dd className="font-semibold">{summary.classes_remaining}</dd></div></dl></article>
      </section>

      <section className="mt-4 rounded-3xl border border-white/70 bg-white/72 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl sm:p-6" aria-labelledby="account-help-title"><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Support</p><h2 id="account-help-title" className="mt-2 text-2xl font-semibold">Need help?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-black/65">Ask Pulse about approved policies or contact the studio directly.</p><div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap"><Link href="/member?assistant=open" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"><MessageCircle className="size-4" aria-hidden="true" /> Ask Pulse</Link><a href={`mailto:${supportEmail}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/20 px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"><Mail className="size-4" aria-hidden="true" /> {supportEmail}</a><a href={`tel:${supportPhoneHref}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/20 px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"><Phone className="size-4" aria-hidden="true" /> {supportPhoneDisplay}</a></div></section>
    </>}
  </PortalShell>;
}
