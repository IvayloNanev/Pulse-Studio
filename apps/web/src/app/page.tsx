import Link from "next/link";
import { ArrowRight, Clock3, Dumbbell, Flame, Gauge } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type HomeSession = {
  class_session_id: string;
  class_type: "yoga" | "cycling" | "hiit";
  class_type_label: string;
  starts_at: string;
  available_spots: number;
  is_full: boolean;
};

const classNames = { yoga: "Studio Flow", cycling: "Pulse Ride", hiit: "Power Interval" };
const sessionTime = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });

const programs = [
  { number: "01", name: "Yoga", detail: "Mobility, control, recovery", icon: Gauge },
  { number: "02", name: "Cycling", detail: "Rhythm, endurance, intensity", icon: Flame },
  { number: "03", name: "HIIT", detail: "Strength, speed, conditioning", icon: Dumbbell },
];

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_class_schedule")
    .select("class_session_id,class_type,class_type_label,starts_at,available_spots,is_full")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(3);
  const sessions = (data ?? []) as HomeSession[];
  return (
    <main className="min-h-screen bg-[#f3f0e9] text-[#111111]">
      <SiteHeader />

      <section className="overflow-hidden border-b border-black/15">
        <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-between border-b border-black/15 px-6 py-12 sm:px-10 lg:border-b-0 lg:border-r lg:px-16 lg:py-16">
            <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-black/55">
              <span className="signal-line h-1 w-14 bg-[#e23b32]" aria-hidden="true" />
              Boutique training · New York
            </div>
            <div className="editorial-rise py-16">
              <p className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-black/55">Train together. Progress individually.</p>
              <h1 className="display-pulse max-w-5xl text-[clamp(4.4rem,11vw,10rem)] uppercase leading-[0.78]">
                Train with
                <br />
                <em>intent.</em>
              </h1>
              <p className="mt-9 max-w-xl text-lg leading-7 text-black/60">
                Yoga, cycling, and HIIT in one focused studio. Build consistency through coached classes and a membership designed around your week.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <Button asChild size="lg" className="h-13 rounded-full bg-[#d8332c] px-8 text-white hover:bg-[#f0443b]">
                <Link href="/join">Start membership <ArrowRight aria-hidden="true" /></Link>
              </Button>
              <Link href="/classes" className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.14em] text-black/60 transition hover:text-black">
                View class schedule <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="atmospheric-motion relative flex items-center overflow-hidden bg-[linear-gradient(125deg,#0b0b0b_5%,#531512_35%,#211f1d_58%,#090909_82%,#6f1c18_100%)] px-6 py-12 text-white sm:px-10 lg:px-12">
            <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.08)_48%,transparent_70%)]" />
            <div className="glass-panel-dark w-full rounded-[2rem] p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-white/15 pb-5">
                <div>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-white/45">Coming up at Pulse</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">Your next session.</h2>
                </div>
                <Clock3 className="size-6 text-[#e23b32]" aria-hidden="true" />
              </div>
              <div>
                {sessions.map((session) => (
                  <Link key={session.class_session_id} href="/classes" className="group grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 border-b border-white/15 py-5">
                    <span className="font-mono text-sm text-white/55">{sessionTime.format(new Date(session.starts_at))}</span>
                    <span>
                      <strong className="block text-base font-semibold">{classNames[session.class_type]}</strong>
                      <span className="text-xs text-white/45">{session.class_type_label}</span>
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55 transition group-hover:text-[#ff5b52]">{session.is_full ? "Waitlist" : `${session.available_spots} spots`}</span>
                  </Link>
                ))}
                {sessions.length === 0 && <p className="py-8 text-sm text-white/55">The next schedule is being prepared.</p>}
              </div>
              <Link href="/classes" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">Full schedule <ArrowRight className="size-4" /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden border-b border-black bg-black py-4 text-white" aria-label="Pulse Studio training loop">
        <div className="kinetic-marquee flex w-max whitespace-nowrap font-mono text-xs font-semibold uppercase tracking-[0.28em]">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center">
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={index} className="flex items-center"><span className="px-8">Train · Recover · Return · Repeat</span><span className="size-1.5 bg-[#d8332c]" /></span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-black/15 px-6 py-20 sm:px-10 lg:px-16 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-black/45">One studio · Three disciplines</p>
            <h2 className="display-pulse mt-5 text-5xl uppercase leading-[0.88] sm:text-7xl">Build your training <em>week.</em></h2>
          </div>
          <div className="border-t border-black/20">
            {programs.map(({ number, name, detail, icon: Icon }) => (
              <Link key={name} href="/classes" className="group grid grid-cols-[3rem_1fr_auto] items-center gap-5 border-b border-black/20 py-7 transition duration-500 hover:bg-black hover:px-5 hover:text-white">
                <span className="font-mono text-xs text-current/45">{number}</span>
                <span><strong className="block text-3xl uppercase tracking-[-0.045em]">{name}</strong><span className="text-sm text-current/55">{detail}</span></span>
                <Icon className="size-6 text-[#e23b32] transition-transform duration-500 group-hover:scale-125" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid bg-[#171717] text-white lg:grid-cols-2">
        <div className="border-b border-white/15 px-6 py-16 sm:px-10 lg:border-b-0 lg:border-r lg:px-16 lg:py-24">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">Monthly membership</p>
          <h2 className="display-pulse mt-6 text-5xl uppercase leading-[0.88] sm:text-7xl">Make movement a <em>habit.</em></h2>
        </div>
        <div className="flex flex-col justify-center px-6 py-16 sm:px-10 lg:px-16">
          <p className="max-w-xl text-lg leading-7 text-white/60">Choose the class allowance that fits your schedule, then use one connected member portal to book, waitlist, cancel, and return.</p>
          <Link href="/membership" className="mt-8 inline-flex w-fit items-center gap-3 border-b-2 border-[#d8332c] pb-2 text-sm font-bold uppercase tracking-[0.15em]">Explore memberships <ArrowRight className="size-4" /></Link>
        </div>
      </section>
    </main>
  );
}
