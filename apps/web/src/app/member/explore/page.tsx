import Link from "next/link";

import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";
import { memberLinks } from "@/lib/member-navigation";

export default async function MemberExplorePage() {
  const { supabase } = await requireMember();
  const now = new Date().toISOString();
  const { data } = await supabase.from("public_class_schedule").select("class_type,class_type_label,instructor_name").gte("starts_at", now).order("starts_at", { ascending: true });
  const classes = Array.from(new Map((data ?? []).map((session) => [session.class_type, session.class_type_label])).entries());
  const instructors = Array.from(new Set((data ?? []).map((session) => session.instructor_name))).sort();
  return <PortalShell audience="member" eyebrow="Member portal" title="Explore" description="Discover classes and instructors." links={memberLinks} showHeader={false}><header className="rounded-3xl bg-[#c72c25] p-6 text-white"><p className="font-mono text-xs uppercase tracking-[0.16em] text-white/70">Explore Pulse</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Find your next favorite class.</h1></header><section className="mt-4 grid gap-4 lg:grid-cols-2"><div className="rounded-3xl border border-black/10 bg-white/65 p-5"><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Class styles</p><div className="mt-4 grid gap-3">{classes.map(([value, label]) => <Link key={value} href={`/member/classes?class=${value}`} className="rounded-2xl border border-black/10 bg-[#f7f4ee] p-4 font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">{label}</Link>)}</div></div><div className="rounded-3xl border border-black/10 bg-[#eee6dc] p-5"><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Instructors on the schedule</p><div className="mt-4 flex flex-wrap gap-2">{instructors.map((instructor) => <Link key={instructor} href={`/member/classes?instructor=${encodeURIComponent(instructor)}`} className="inline-flex min-h-11 items-center rounded-full border border-black/15 bg-white/65 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">{instructor}</Link>)}</div></div></section></PortalShell>;
}
