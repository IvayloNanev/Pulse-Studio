import Link from "next/link";
import { ArrowRight, CircleArrowDown } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

const disciplines = [
  { number: "01", name: "Yoga", detail: "Control, mobility, and deliberate recovery." },
  { number: "02", name: "Cycling", detail: "Rhythm-driven endurance with measurable intensity." },
  { number: "03", name: "HIIT", detail: "Efficient strength and conditioning without excess." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f3f0e9] text-[#111111]">
      <SiteHeader />

      <section className="grid min-h-[calc(100vh-5rem)] border-b border-black/15 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col justify-between px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
          <p className="max-w-md text-xs font-semibold uppercase tracking-[0.24em] text-black/55">
            A single-location studio in New York
          </p>
          <div className="py-20 lg:py-12">
            <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-black/55">
              Practice with purpose
            </p>
            <h1 className="max-w-5xl text-[clamp(4rem,10vw,9rem)] font-semibold uppercase leading-[0.82] tracking-[-0.075em]">
              Find your
              <br />
              next rhythm.
            </h1>
          </div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-12 rounded-none bg-[#c72c25] px-7 text-white hover:bg-[#a9231e]">
              <Link href="/join">
                Join now <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Link className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline" href="/classes">
              Explore this week&apos;s classes <CircleArrowDown className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="relative min-h-[32rem] overflow-hidden bg-[#161616] text-white">
          <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_30%_25%,#6e6a61_0,transparent_28%),radial-gradient(circle_at_70%_65%,#36332e_0,transparent_35%),linear-gradient(145deg,#161616_10%,#2b2925_48%,#090909_100%)]" />
          <div className="absolute -right-32 top-1/2 size-[32rem] -translate-y-1/2 rounded-full border border-white/20" />
          <div className="absolute -right-12 top-1/2 size-[20rem] -translate-y-1/2 rounded-full border border-white/25" />
          <div className="relative flex h-full min-h-[32rem] flex-col justify-between p-8 lg:p-12">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/55">Pulse / NYC</span>
            <div className="glass-panel-dark max-w-md p-6 sm:p-8">
              <p className="max-w-sm text-2xl font-medium leading-tight tracking-[-0.03em]">
                Three disciplines. One membership. A schedule that meets you where you are.
              </p>
              <p className="mt-5 text-sm text-white/55">Yoga · Cycling · HIIT</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-6 py-20 sm:px-10 lg:px-16 lg:py-28">
        <div className="pointer-events-none absolute -right-32 top-20 size-80 rounded-full bg-[#c72c25]/8 blur-3xl" />
        <div className="mb-14 flex items-end justify-between gap-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-black/50">The practice</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">Choose how you move.</h2>
          </div>
          <Link href="/classes" className="hidden text-sm font-semibold uppercase tracking-[0.14em] hover:underline md:block">
            View schedule
          </Link>
        </div>
        <div className="border-t border-black/20">
          {disciplines.map((discipline) => (
            <Link
              key={discipline.name}
              href="/classes"
              className="group grid gap-4 border-b border-black/20 py-7 transition-colors hover:bg-black hover:px-5 hover:text-white md:grid-cols-[5rem_1fr_1fr_auto] md:items-center"
            >
              <span className="font-mono text-xs text-current/55">{discipline.number}</span>
              <span className="text-3xl font-semibold tracking-[-0.04em]">{discipline.name}</span>
              <span className="text-sm text-current/60">{discipline.detail}</span>
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
