import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function recoveryDestination(requestUrl: URL, audience: "member" | "staff", error?: string) {
  const destination = new URL("/auth/update-password", requestUrl.origin);
  destination.searchParams.set("audience", audience);
  if (error) destination.searchParams.set("error", error);
  return destination;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedAudience = requestUrl.searchParams.get("audience") === "staff" ? "staff" : "member";

  if (!code) {
    return NextResponse.redirect(recoveryDestination(requestUrl, requestedAudience, "missing_code"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(recoveryDestination(requestUrl, requestedAudience, "invalid_or_expired"));
  }

  const { data: staffId } = await supabase.rpc("current_staff_id");
  return NextResponse.redirect(recoveryDestination(requestUrl, staffId ? "staff" : requestedAudience));
}
