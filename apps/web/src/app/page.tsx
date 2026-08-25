import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";

import { HeroVideo } from "@/components/hero-video";
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
  {
    number: "01",
    name: "Yoga",
    image: "/media/classes/yoga.jpg",
    detail: "Build mobility, balance, and control through intentional sequences that strengthen the body while making room to recover.",
  },
  {
    number: "02",
    name: "Cycling",
    image: "/media/classes/cycling.jpg",
    detail: "Ride through coached intervals that combine rhythm, endurance, and focused intensity in one immersive session.",
  },
  {
    number: "03",
    name: "HIIT",
    image: "/media/classes/hiit.jpg",
    detail: "Train strength, speed, and conditioning with efficient full-body intervals designed to challenge every fitness level.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: scheduleData } = await supabase
    .from("public_class_schedule")
    .select("class_session_id,class_type,class_type_label,starts_at,available_spots,is_full")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(3);
  const sessions = (scheduleData ?? []) as HomeSession[];
  return (
    <main className="min-h-screen bg-[#f3f0e9] text-[#111111]">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-white/15 bg-black text-white">
        <HeroVideo />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
        <div className="relative z-10 grid lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-between px-6 py-10 sm:px-10 sm:py-12 lg:px-16 lg:py-16">
            <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-white/70">
              <span className="signal-line h-1 w-14 bg-[#e23b32]" aria-hidden="true" />
              Boutique training · New York
            </div>
            <div className="editorial-rise py-12 sm:py-14 lg:py-16">
              <p className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Train together. Progress individually.</p>
              <h1 className="display-pulse max-w-5xl text-[clamp(4.4rem,11vw,10rem)] uppercase leading-[0.78]">
                Train with
                <br />
                <em>intent.</em>
              </h1>
              <p className="mt-9 max-w-xl text-lg leading-7 text-white/75">
                Yoga, cycling, and HIIT in one focused studio. Build consistency through coached classes and a membership designed around your week.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <Button asChild size="lg" className="h-13 rounded-full bg-[#d8332c] px-8 text-white hover:bg-[#f0443b]">
                <Link href="/join">Start membership <ArrowRight aria-hidden="true" /></Link>
              </Button>
              <Link href="/classes" className="inline-flex min-h-11 items-center gap-3 rounded-full px-2 text-sm font-semibold uppercase tracking-[0.14em] text-white/80 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                View class schedule <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="relative flex items-center px-6 pb-10 text-white sm:px-10 sm:pb-12 lg:px-12 lg:py-12">
            <div className="glass-panel-dark relative w-full rounded-[2rem] p-5 sm:p-8">
              <div className="flex items-center justify-between border-b border-white/15 pb-5">
                <div>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-white/70">Coming up at Pulse</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] sm:text-3xl">Next at Pulse.</h2>
                </div>
                <Clock3 className="size-6 text-[#e23b32]" aria-hidden="true" />
              </div>
              <div>
                {sessions.map((session, index) => (
                  <Link key={session.class_session_id} href={`/classes?class_type=${session.class_type}`} className={`group grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 border-b border-white/15 py-4 sm:py-5 ${index === 2 ? "hidden sm:grid" : "grid"}`}>
                    <span className="font-mono text-sm text-white/55">{sessionTime.format(new Date(session.starts_at))}</span>
                    <span>
                      <strong className="block text-base font-semibold">{classNames[session.class_type]}</strong>
                      <span className="text-xs text-white/70">{session.class_type_label}</span>
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55 transition group-hover:text-[#ff5b52]">{session.is_full ? "Waitlist" : `${session.available_spots} spots`}</span>
                  </Link>
                ))}
                {sessions.length === 0 && <p className="py-8 text-sm text-white/55">The next schedule is being prepared.</p>}
              </div>
              <Link href="/classes" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Full schedule <ArrowRight className="size-4" /></Link>
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
        <div className="mx-auto max-w-[90rem]">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-black/60">One studio · Three disciplines</p>
            <h2 className="display-pulse mt-5 text-5xl uppercase leading-[0.88] sm:text-7xl">Build your training <em>week.</em></h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {programs.map(({ number, name, detail, image }) => (
              <Link key={name} href={`/classes?class_type=${name.toLowerCase()}`} className="group flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-black/15 bg-white/55 transition duration-500 hover:-translate-y-1 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c72c25] motion-reduce:transform-none">
                <span className="relative block aspect-[3/2] overflow-hidden bg-black">
                  <Image src={image} alt={`${name} class at Pulse Studio`} fill sizes="(min-width: 1280px) 31vw, (min-width: 768px) 48vw, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.03] motion-reduce:transform-none" />
                  <span className="absolute left-4 top-4 rounded-full border border-white/30 bg-black/55 px-3 py-1 font-mono text-xs text-white backdrop-blur-md">{number}</span>
                </span>
                <span className="flex flex-1 flex-col p-5 sm:p-6">
                  <strong className="text-3xl uppercase tracking-[-0.045em]">{name}</strong>
                  <span className="mt-3 flex-1 text-sm leading-6 text-black/65">{detail}</span>
                  <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#b92520]">Find a class <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" /></span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
