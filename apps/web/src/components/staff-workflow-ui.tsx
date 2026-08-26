import type { ReactNode } from "react";

export function StaffWorkflowLabel({ product, workflow }: { product: string; workflow: string }) {
  return <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#8e211c]">{product} · {workflow}</p>;
}

export function StaffUrgencyBadge({ level, children }: { level: "urgent" | "attention" | "ready" | "informational"; children: ReactNode }) {
  const tone = level === "urgent"
    ? "border-[#a9231e] bg-[#a9231e] text-white"
    : level === "attention"
      ? "border-amber-700/20 bg-amber-100 text-amber-950"
      : level === "ready"
        ? "border-emerald-800/15 bg-emerald-100 text-emerald-950"
        : "border-black/15 bg-white/70 text-black/70";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{children}</span>;
}

export function StaffReason({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-black/10 bg-[#f1ebe3] p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/55">Why this needs attention</p><div className="mt-1 text-sm leading-6 text-black/75">{children}</div></div>;
}

export function StaffMetric({ value, label, emphasis = false }: { value: ReactNode; label: string; emphasis?: boolean }) {
  return <div className="rounded-2xl border border-black/10 bg-white/65 p-3"><p className={`text-2xl font-semibold ${emphasis ? "text-[#8e211c]" : ""}`}>{value}</p><p className="mt-0.5 text-xs text-black/65">{label}</p></div>;
}
