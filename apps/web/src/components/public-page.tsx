import Image from "next/image";

import { SiteHeader } from "@/components/site-header";

type PublicPageProps = {
  eyebrow: string;
  title: string;
  introduction: string;
  children: React.ReactNode;
  compact?: boolean;
  heroImage?: string;
  heroImageAlt?: string;
};

export function PublicPage({ eyebrow, title, introduction, children, compact = false, heroImage, heroImageAlt = "" }: PublicPageProps) {
  return (
    <main className={`relative isolate min-h-screen text-[#111111] ${heroImage ? "bg-transparent" : "bg-[#f3f0e9]"}`}>
      {heroImage ? <div className="fixed inset-0 -z-20"><Image src={heroImage} alt={heroImageAlt} fill priority sizes="100vw" className="object-cover object-center" /></div> : null}
      {heroImage ? <div className="fixed inset-0 -z-10 bg-black/58" aria-hidden="true" /> : null}
      <SiteHeader />
      <header className={`relative overflow-hidden px-6 sm:px-10 lg:px-16 ${heroImage ? `flex items-center text-white ${compact ? "min-h-[clamp(30rem,66svh,42rem)]" : "min-h-[calc(100svh-5rem)]"}` : "border-b border-black/15"} ${compact && !heroImage ? "py-10 lg:py-14" : "py-16 lg:py-24"}`}>
        {!heroImage ? <div className="pointer-events-none absolute -right-24 -top-40 size-[30rem] rounded-full bg-white/75 blur-3xl" /> : null}
        <div className="relative mx-auto w-full max-w-[90rem]">
          <p className={`font-mono text-xs uppercase tracking-[0.2em] ${heroImage ? "text-white/75" : "text-black/60"}`}>{eyebrow}</p>
          <h1 className={`mt-5 font-heading leading-[0.88] tracking-[-0.06em] ${compact ? "max-w-4xl text-[clamp(3rem,6vw,5.5rem)]" : "max-w-5xl text-[clamp(3.5rem,9vw,8rem)]"}`}>
            {title}
          </h1>
          <p className={`max-w-2xl rounded-2xl border p-5 text-base leading-7 backdrop-blur-xl ${heroImage ? "border-white/20 bg-black/30 text-white/80" : "glass-panel border-transparent text-black/60"} ${compact ? "mt-5" : "mt-8"}`}>{introduction}</p>
        </div>
      </header>
      {children}
    </main>
  );
}
