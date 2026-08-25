import Link from "next/link";

import { PublicPage } from "@/components/public-page";
import { createClient } from "@/lib/supabase/server";

type ScheduleSession = {
  class_session_id: string;
  class_type: "yoga" | "cycling" | "hiit";
  class_type_label: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  confirmed_reservations: number;
  waitlisted_reservations: number;
  available_spots: number;
  is_full: boolean;
  instructor_staff_id: string;
  instructor_name: string;
};

const classNames: Record<ScheduleSession["class_type"], string> = {
  yoga: "Studio Flow",
  cycling: "Pulse Ride",
  hiit: "Power Interval",
};

const classIntroductions: Record<ScheduleSession["class_type"], string> = {
  yoga: "Build mobility, balance, and control through coached sequences that create strength and space to recover.",
  cycling: "Ride through rhythm-driven intervals designed to develop cardiovascular endurance, power, and focus.",
  hiit: "Train strength, speed, and conditioning through efficient full-body intervals with scalable coaching.",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  month: "long",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function durationInMinutes(startsAt: string, endsAt: string) {
  return Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000);
}

function groupByDate(sessions: ScheduleSession[]) {
  return sessions.reduce<Map<string, ScheduleSession[]>>((groups, session) => {
    const label = dateFormatter.format(new Date(session.starts_at));
    groups.set(label, [...(groups.get(label) ?? []), session]);
    return groups;
  }, new Map());
}

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ class_type?: string }> }) {
  const params = await searchParams;
  const selectedClassType = (["yoga", "cycling", "hiit"] as const).find((type) => type === params.class_type);
  const supabase = await createClient();
  const now = new Date();
  const through = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  let scheduleQuery = supabase
    .from("public_class_schedule")
    .select("class_session_id,class_type,class_type_label,starts_at,ends_at,capacity,confirmed_reservations,waitlisted_reservations,available_spots,is_full,instructor_staff_id,instructor_name")
    .gte("starts_at", now.toISOString())
    .lt("starts_at", through.toISOString());
  if (selectedClassType) scheduleQuery = scheduleQuery.eq("class_type", selectedClassType);
  const { data, error } = await scheduleQuery.order("starts_at", { ascending: true });

  const sessions = (data ?? []) as ScheduleSession[];
  const groupedSessions = groupByDate(sessions);

  return (
    <PublicPage
      heroImage={selectedClassType ? `/media/classes/${selectedClassType}.jpg` : "/media/classes/cycling.jpg"}
      heroImageAlt={`${selectedClassType ? classNames[selectedClassType] : "Pulse Studio"} class`}
      eyebrow={selectedClassType ? `${classNames[selectedClassType]} schedule` : "Weekly schedule"}
      title={selectedClassType ? classNames[selectedClassType] : "Move through the city."}
      introduction={selectedClassType ? classIntroductions[selectedClassType] : "Explore Yoga, Cycling, and HIIT sessions, with current availability from the Pulse Studio schedule."}
    >
      <section className="mx-4 my-8 rounded-[2.5rem] border border-white/55 bg-[#f3f0e9]/95 px-6 py-12 shadow-[0_32px_90px_rgba(0,0,0,0.24)] backdrop-blur-none sm:mx-8 sm:bg-[#f3f0e9]/88 sm:px-10 sm:backdrop-blur-xl lg:mx-12 lg:px-12 lg:py-16">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/60 sm:hidden">Swipe to see every discipline →</p>
        <nav aria-label="Filter schedule by discipline" className="mb-8 flex gap-2 overflow-x-auto scroll-smooth pb-3 pr-10 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] sm:pr-0 sm:[mask-image:none]">
          {[
            { label: "All classes", href: "/classes", type: undefined },
            { label: "Yoga", href: "/classes?class_type=yoga", type: "yoga" },
            { label: "Cycling", href: "/classes?class_type=cycling", type: "cycling" },
            { label: "HIIT", href: "/classes?class_type=hiit", type: "hiit" },
          ].map((filter) => {
            const active = selectedClassType === filter.type;
            return <Link key={filter.label} href={filter.href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-5 text-xs font-bold uppercase tracking-[0.12em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c72c25] ${active ? "border-black bg-black text-white" : "border-black/20 bg-white/55 text-black hover:bg-white"}`}>{filter.label}</Link>;
          })}
        </nav>
        <div className="mb-12 flex flex-col justify-between gap-4 border-b border-black/20 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-black/60">Next 30 days · New York</p>
            <h2 className="display-pulse mt-3 text-4xl sm:text-5xl">{selectedClassType ? `${classNames[selectedClassType]} classes.` : "Live studio schedule."}</h2>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <p className="max-w-sm text-sm leading-6 text-black/65 sm:text-right">Times and availability reflect the current studio schedule.</p>
          </div>
        </div>

        {error ? (
          <div role="alert" className="border border-[#c72c25]/35 bg-[#c72c25]/5 p-6 text-sm text-[#8e211c]">
            The class schedule is temporarily unavailable. Please refresh and try again.
          </div>
        ) : sessions.length === 0 ? (
          <div className="border border-black/15 p-8 text-sm text-black/65">No {selectedClassType ? classNames[selectedClassType] : "sessions"} are currently scheduled in the next 30 days.</div>
        ) : (
          <div className="space-y-14">
            {[...groupedSessions.entries()].map(([date, daySessions]) => (
              <section key={date} aria-labelledby={`day-${daySessions[0].class_session_id}`}>
                <h3 id={`day-${daySessions[0].class_session_id}`} className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-black/60">{date}</h3>
                <div className="border-t border-black/20">
                  {daySessions.map((session) => (
                    <article key={session.class_session_id} className="group grid gap-4 border-b border-black/20 py-7 transition-colors hover:bg-white/45 md:grid-cols-[7rem_1.2fr_0.9fr_minmax(13rem,auto)] md:items-center md:px-3">
                      <time dateTime={session.starts_at} className="font-mono text-sm">{timeFormatter.format(new Date(session.starts_at))}</time>
                      <div>
                        <h4 className="text-2xl font-semibold tracking-[-0.035em]">{classNames[session.class_type]}</h4>
                        <p className="mt-1 text-sm text-black/60">with {session.instructor_name}</p>
                      </div>
                      <div className="text-sm text-black/55">
                        <p>{session.class_type_label} · {durationInMinutes(session.starts_at, session.ends_at)} min</p>
                        <p className="mt-1">{session.confirmed_reservations} of {session.capacity} reserved</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <span className={`inline-flex border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] ${session.is_full ? "border-black/20 text-black/60" : "border-[#c72c25]/40 text-[#a9231e]"}`}>
                          {session.is_full ? `Waitlist · ${session.waitlisted_reservations}` : `${session.available_spots} spots left`}
                        </span>
                        <Link href={`/login?next=${encodeURIComponent(`/member/classes?day=${dayKeyFormatter.format(new Date(session.starts_at))}&class=${session.class_type}`)}`} className="inline-flex min-h-11 items-center rounded-full bg-black px-4 text-xs font-bold uppercase tracking-[0.1em] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c72c25]">Login to reserve</Link>
                        <Link href="/join" className="inline-flex min-h-11 items-center rounded-full border border-black/25 px-4 text-xs font-bold uppercase tracking-[0.1em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c72c25]">Join</Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </PublicPage>
  );
}
