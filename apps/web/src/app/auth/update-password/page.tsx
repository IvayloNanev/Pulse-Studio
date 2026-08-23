import { UpdatePasswordForm } from "@/components/update-password-form";
import { createClient } from "@/lib/supabase/server";

type UpdatePasswordPageProps = {
  searchParams: Promise<{ audience?: string; error?: string }>;
};

export default async function UpdatePasswordPage({ searchParams }: UpdatePasswordPageProps) {
  const query = await searchParams;
  const audience = query.audience === "staff" ? "staff" : "member";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  return (
    <UpdatePasswordForm
      audience={audience}
      sessionReady={Boolean(data.user) && !error && !query.error}
      recoveryError={query.error ?? (error || !data.user ? "missing_session" : null)}
    />
  );
}
