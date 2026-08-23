import Link from "next/link";
import { BookOpen, MessageCircle, PauseCircle, ShieldCheck } from "lucide-react";

import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";
import { memberLinks } from "@/lib/member-navigation";

export default async function MemberServicesPage() {
  await requireMember();
  const services = [
    { title: "Pulse Assistant", detail: "Ask about classes, preparation, booking, cancellations, and membership policies.", href: "/member?assistant=open", icon: MessageCircle },
    { title: "Membership guidance", detail: "Understand credits, billing cycles, pauses, and cancellation rules.", href: "/member/account", icon: ShieldCheck },
    { title: "Class preparation", detail: "Review what to bring and how to prepare before your next session.", href: "/member?assistant=open", icon: BookOpen },
    { title: "Pause information", detail: "See your current membership state and the rules that apply to a pause.", href: "/member/account", icon: PauseCircle },
  ];
  return <PortalShell audience="member" eyebrow="Member portal" title="Services" description="Studio support and membership guidance." links={memberLinks} showHeader={false}><header className="rounded-3xl bg-[#171717] p-6 text-white"><p className="font-mono text-xs uppercase tracking-[0.16em] text-white/65">Member services</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">How can we help?</h1><p className="mt-2 text-sm text-white/70">Use approved studio guidance whenever you need it.</p></header><section className="mt-4 grid gap-3 md:grid-cols-2">{services.map(({ title, detail, href, icon: Icon }) => <Link key={title} href={href} className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"><Icon className="size-5 text-[#c72c25]" aria-hidden="true" /><h2 className="mt-6 text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-black/65">{detail}</p></Link>)}</section></PortalShell>;
}
