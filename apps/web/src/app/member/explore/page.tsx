import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";
import { memberLinks } from "@/lib/member-navigation";

type ScheduleEntry = {
  class_type: "yoga" | "cycling" | "hiit";
  class_type_label: string;
  instructor_name: string;
};

export default async function MemberExplorePage() {
  const { supabase } = await requireMember();
  const { data, error } = await supabase
    .from("public_class_schedule")
    .select("class_type,class_type_label,instructor_name")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  const schedule = (data ?? []) as ScheduleEntry[];
  const classTypes = Array.from(new Map(schedule.map((session) => [session.class_type, session.class_type_label])).entries());
  const instructorClasses = Array.from(
    new Map(schedule.map((session) => [`${session.instructor_name}-${session.class_type}`, session])).values(),
  ).sort((a, b) => a.instructor_name.localeCompare(b.instructor_name) || a.class_type_label.localeCompare(b.class_type_label));

  return (
    <PortalShell audience="member" eyebrow="Member portal" title="Explore" description="Discover classes and instructors." links={memberLinks} showHeader={false}>
      <header className="rounded-3xl bg-[#c72c25] p-6 text-white shadow-[0_1.25rem_3rem_rgba(111,20,17,0.18)] sm:p-8">
        <p className="route-eyebrow text-white/75">Explore Pulse</p>
        <div className="mt-2 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)] xl:items-end">
          <h1 className="route-title max-w-3xl text-3xl sm:text-4xl xl:text-5xl">Find your next favorite class.</h1>
          <p className="max-w-xl text-sm leading-6 text-white/80 xl:justify-self-end">Choose a class style, then select an instructor to open a focused schedule.</p>
        </div>
      </header>

      {error ? (
        <div role="alert" className="mt-4 rounded-3xl border border-black/15 bg-white/70 p-5 text-sm text-[#8e211c]">Class and instructor information is temporarily unavailable.</div>
      ) : schedule.length === 0 ? (
        <section className="mt-4 rounded-3xl border border-dashed border-black/25 bg-white/65 p-8 text-center">
          <h2 className="text-xl font-semibold">No upcoming classes to explore</h2>
          <p className="mt-2 text-sm text-black/65">The studio has not published future sessions yet. Check again after the schedule is updated.</p>
        </section>
      ) : (
        <>
          <section className="mt-4 rounded-3xl border border-white/70 bg-white/68 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl sm:p-6" aria-labelledby="explore-classes-title">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-black/65">Class styles</p>
            <h2 id="explore-classes-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Explore by class</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {classTypes.map(([value, label]) => (
                <article key={value} className="flex h-full flex-col rounded-3xl border border-black/10 bg-[#f7f4ee] p-5">
                  <h3 className="text-xl font-semibold">{label}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-black/65">See upcoming {label} sessions, live availability, and booking options in one focused schedule.</p>
                  <Link href={`/member/classes?class=${value}`} className="mt-5 inline-flex min-h-11 items-center justify-between rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">View {label} schedule <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-4 rounded-3xl border border-black/10 bg-[#eee6dc] p-5 sm:p-6" aria-labelledby="explore-instructors-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/65">Instructor directory</p><h2 id="explore-instructors-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Browse every instructor and class</h2></div>
              <p className="text-sm font-semibold text-black/65">{instructorClasses.length} instructor–class options</p>
            </div>
            <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {instructorClasses.map((session) => (
                <Link key={`${session.instructor_name}-${session.class_type}`} href={`/member/classes?class=${session.class_type}&instructor=${encodeURIComponent(session.instructor_name)}`} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 transition hover:border-black/30 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">
                  <span><span className="block font-semibold">{session.instructor_name}</span><span className="mt-0.5 block text-sm text-black/65">{session.class_type_label}</span></span>
                  <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </PortalShell>
  );
}
