import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function recoveryDestination(requestUrl: URL, error?: string) {
  const audience = requestUrl.searchParams.get("audience") === "member" ? "member" : "staff";
  const destination = new URL("/auth/update-password", requestUrl.origin);
  destination.searchParams.set("audience", audience);
  if (error) destination.searchParams.set("error", error);
  return destination;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(recoveryDestination(requestUrl, "missing_code"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(recoveryDestination(requestUrl, "invalid_or_expired"));
  }

  return NextResponse.redirect(recoveryDestination(requestUrl));
}
