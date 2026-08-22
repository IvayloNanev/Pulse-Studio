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
      <header className="border-b border-black/15 px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-black/50">{eyebrow}</p>
        <h1 className="mt-6 max-w-5xl font-heading text-[clamp(3.5rem,9vw,8rem)] leading-[0.86] tracking-[-0.065em]">
          {title}
        </h1>
        <p className="mt-8 max-w-2xl text-base leading-7 text-black/60">{introduction}</p>
      </header>
      {children}
    </main>
  );
}
