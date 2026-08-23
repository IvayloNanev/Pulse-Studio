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

export default async function ClassesPage() {
  const supabase = await createClient();
  const now = new Date();
  const through = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("public_class_schedule")
    .select("class_session_id,class_type,class_type_label,starts_at,ends_at,capacity,confirmed_reservations,waitlisted_reservations,available_spots,is_full,instructor_staff_id,instructor_name")
    .gte("starts_at", now.toISOString())
    .lt("starts_at", through.toISOString())
    .order("starts_at", { ascending: true });

  const sessions = (data ?? []) as ScheduleSession[];
  const groupedSessions = groupByDate(sessions);

  return (
    <PublicPage eyebrow="Weekly schedule" title="Move through the city." introduction="Yoga, cycling, and HIIT sessions from the shared Pulse Studio schedule, with availability calculated directly by the backend.">
      <section className="px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="mb-12 flex flex-col justify-between gap-4 border-b border-black/20 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-black/45">Next 30 days · New York</p>
            <h2 className="display-pulse mt-3 text-4xl sm:text-5xl">Live studio schedule.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-black/55">Capacity and waitlist counts are live from the shared Supabase contract.</p>
        </div>

        {error ? (
          <div role="alert" className="border border-[#c72c25]/35 bg-[#c72c25]/5 p-6 text-sm text-[#8e211c]">
            The class schedule is temporarily unavailable. Please refresh and try again.
          </div>
        ) : sessions.length === 0 ? (
          <div className="border border-black/15 p-8 text-sm text-black/55">No sessions are currently scheduled in the next 30 days.</div>
        ) : (
          <div className="space-y-14">
            {[...groupedSessions.entries()].map(([date, daySessions]) => (
              <section key={date} aria-labelledby={`day-${daySessions[0].class_session_id}`}>
                <h3 id={`day-${daySessions[0].class_session_id}`} className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-black/45">{date}</h3>
                <div className="border-t border-black/20">
                  {daySessions.map((session) => (
                    <article key={session.class_session_id} className="group grid gap-4 border-b border-black/20 py-7 transition-colors hover:bg-white/45 md:grid-cols-[8rem_1.35fr_1fr_1fr] md:items-center md:px-3">
                      <time dateTime={session.starts_at} className="font-mono text-sm">{timeFormatter.format(new Date(session.starts_at))}</time>
                      <div>
                        <h4 className="text-2xl font-semibold tracking-[-0.035em]">{classNames[session.class_type]}</h4>
                        <p className="mt-1 text-sm text-black/50">with {session.instructor_name}</p>
                      </div>
                      <div className="text-sm text-black/55">
                        <p>{session.class_type_label} · {durationInMinutes(session.starts_at, session.ends_at)} min</p>
                        <p className="mt-1">{session.confirmed_reservations} of {session.capacity} reserved</p>
                      </div>
                      <div className="md:text-right">
                        <span className={`inline-flex border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] ${session.is_full ? "border-black/20 text-black/45" : "border-[#c72c25]/40 text-[#a9231e]"}`}>
                          {session.is_full ? `Waitlist · ${session.waitlisted_reservations}` : `${session.available_spots} spots left`}
                        </span>
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
