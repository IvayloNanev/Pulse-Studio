import { SiteHeader } from "@/components/site-header";

type PublicPageProps = {
  eyebrow: string;
  title: string;
  introduction: string;
  children: React.ReactNode;
};

export function PublicPage({ eyebrow, title, introduction, children }: PublicPageProps) {
  return (
    <main className="min-h-screen bg-[#f3f0e9] text-[#111111]">
      <SiteHeader />
      <header className="relative overflow-hidden border-b border-black/15 px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="pointer-events-none absolute -right-24 -top-40 size-[30rem] rounded-full bg-white/75 blur-3xl" />
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-black/60">{eyebrow}</p>
          <h1 className="mt-6 max-w-5xl font-heading text-[clamp(3.5rem,9vw,8rem)] leading-[0.86] tracking-[-0.065em]">
            {title}
          </h1>
          <p className="glass-panel mt-8 max-w-2xl rounded-2xl p-5 text-base leading-7 text-black/60">{introduction}</p>
        </div>
      </header>
      {children}
    </main>
  );
}
