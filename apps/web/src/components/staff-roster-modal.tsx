"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function StaffRosterModal({ closeHref, children }: { closeHref: string; children: React.ReactNode }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.focus();
    const keepFocusInDialog = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        router.push(closeHref);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", keepFocusInDialog);
    return () => window.removeEventListener("keydown", keepFocusInDialog);
  }, [closeHref, router]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm" role="presentation">
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="quick-roster-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-[0_2rem_5rem_rgba(0,0,0,0.28)] backdrop-blur-2xl outline-none sm:p-7">
        {children}
      </section>
    </div>
  );
}
