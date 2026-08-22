import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-baseline gap-2 font-semibold uppercase tracking-[-0.04em] ${inverse ? "text-white" : "text-black"}`}
      aria-label="Pulse Studio home"
    >
      <span className="text-xl">Pulse</span>
      <span className="font-mono text-[0.62rem] font-medium tracking-[0.16em] opacity-55">Studio</span>
    </Link>
  );
}
