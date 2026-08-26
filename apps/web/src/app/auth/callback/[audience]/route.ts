import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RecoveryCallbackContext = {
  params: Promise<{ audience: string }>;
};

function recoveryDestination(requestUrl: URL, audience: "member" | "staff", error?: string) {
  const destination = new URL("/auth/update-password", requestUrl.origin);
  destination.searchParams.set("audience", audience);
  if (error) destination.searchParams.set("error", error);
  return destination;
}

export async function GET(request: Request, context: RecoveryCallbackContext) {
  const requestUrl = new URL(request.url);
  const { audience: requestedAudience } = await context.params;
  const audience = requestedAudience === "staff" ? "staff" : "member";
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(recoveryDestination(requestUrl, audience, "missing_code"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(recoveryDestination(requestUrl, audience, "invalid_or_expired"));
  }

  return NextResponse.redirect(recoveryDestination(requestUrl, audience));
}
