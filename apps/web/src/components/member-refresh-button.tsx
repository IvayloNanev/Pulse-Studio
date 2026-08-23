"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function MemberRefreshButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" disabled={pending} aria-busy={pending} onClick={() => startTransition(() => router.refresh())} className={`inline-flex min-h-11 items-center gap-2 font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:opacity-55 ${className}`}><RefreshCw className={`size-4 ${pending ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />{pending ? "Refreshing…" : "Refresh"}</button>;
}
