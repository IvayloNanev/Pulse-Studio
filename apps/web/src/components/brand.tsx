import Link from "next/link";

export function Brand({ inverse = false, prominent = false }: { inverse?: boolean; prominent?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex max-w-full min-w-0 items-center ${prominent ? "gap-3 sm:gap-5" : "gap-3"} ${inverse ? "text-white" : "text-black"}`}
      aria-label="Pulse Studio home"
    >
      <svg viewBox="0 0 64 40" className={prominent ? "h-12 w-16 shrink-0 overflow-visible sm:h-16 sm:w-24" : "h-9 w-14 shrink-0 overflow-visible"} aria-hidden="true">
        <g fill="#c72c25">
          <rect className="sound-wave-bar" x="2" y="14" width="5" height="12" rx="2.5" />
          <rect className="sound-wave-bar" x="11" y="8" width="5" height="24" rx="2.5" />
          <rect className="sound-wave-bar" x="20" y="3" width="5" height="34" rx="2.5" />
          <rect className="sound-wave-bar" x="29" y="11" width="5" height="18" rx="2.5" />
          <rect className="sound-wave-bar" x="38" y="5" width="5" height="30" rx="2.5" />
          <rect className="sound-wave-bar" x="47" y="10" width="5" height="20" rx="2.5" />
          <rect className="sound-wave-bar" x="56" y="15" width="5" height="10" rx="2.5" />
        </g>
      </svg>
      <span className="flex min-w-0 items-baseline gap-2">
        <span className={`pulse-wordmark uppercase leading-none ${prominent ? "text-4xl sm:text-5xl" : "text-[1.55rem]"}`}>Pulse</span>
        <span className={`font-mono font-medium uppercase tracking-[0.19em] opacity-55 ${prominent ? "text-xs" : "text-[0.58rem]"}`}>Studio</span>
      </span>
    </Link>
  );
}
