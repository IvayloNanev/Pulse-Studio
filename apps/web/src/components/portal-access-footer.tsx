import Link from "next/link";

export function PortalAccessFooter() {
  return (
    <footer className="platform-gutter border-t border-white/15 bg-black py-8 text-white">
      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-2xl tracking-[-0.04em]">Pulse Studio</p>
          <p className="mt-1 text-sm text-white/65">Private access for the Pulse Studio team.</p>
        </div>
        <Link
          href="/staff/login"
          className="inline-flex min-h-11 items-center justify-center self-start rounded-full border border-white/25 px-5 text-sm font-semibold transition hover:border-white hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:self-auto"
        >
          Staff portal
        </Link>
      </div>
    </footer>
  );
}
