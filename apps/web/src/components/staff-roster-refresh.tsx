"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function StaffRosterRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(interval);
  }, [router]);

  return <p className="text-xs text-black/60">Attendance eligibility refreshes automatically every 30 seconds.</p>;
}
