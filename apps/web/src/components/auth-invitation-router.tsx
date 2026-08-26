"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function AuthInvitationRouter() {
  const router = useRouter();

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (parameters.get("type") !== "invite") return;

    let active = true;

    async function routeInvitation() {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!active || !data.session) return;

      const { data: staffId } = await supabase.rpc("current_staff_id");
      if (!active) return;

      router.replace(`/auth/update-password?audience=${staffId ? "staff" : "member"}`);
      router.refresh();
    }

    void routeInvitation();
    return () => {
      active = false;
    };
  }, [router]);

  return null;
}
