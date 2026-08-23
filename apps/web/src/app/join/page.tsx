import Link from "next/link";

import { submitMembershipApplication } from "@/app/join/actions";
import { MemberStatusMessage } from "@/components/member-status-message";
import { PublicPage } from "@/components/public-page";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type Plan = { plan_id: string; plan_name: string; classes_per_month: number; monthly_price: number };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ plan?: string; success?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.from("membership_plans").select("plan_id,plan_name,classes_per_month,monthly_price").order("classes_per_month");
  const plans = (data ?? []) as Plan[];
  const selectedPlan = plans.some((plan) => plan.plan_id === params.plan) ? params.plan : plans[0]?.plan_id;

  return (
    <PublicPage eyebrow="Join Pulse" title="Begin with intention." introduction="Choose a membership and submit your application. Pulse Studio staff will confirm account activation and payment details with you.">
      <section className="px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="max-w-2xl border-t border-black/20 pt-8">
          <MemberStatusMessage success={params.success} error={params.error ?? error?.message} />
          {!params.success && !error && (
            <form action={submitMembershipApplication}>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="text-sm font-medium">First name<input name="first_name" autoComplete="given-name" required className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2" /></label>
                <label className="text-sm font-medium">Last name<input name="last_name" autoComplete="family-name" required className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2" /></label>
                <label className="text-sm font-medium sm:col-span-2">Email address<input name="email" type="email" autoComplete="email" required className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2" /></label>
                <label className="text-sm font-medium sm:col-span-2">Phone number <span className="font-normal text-black/50">(optional)</span><input name="phone" type="tel" autoComplete="tel" className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2" /></label>
                <label className="text-sm font-medium sm:col-span-2">Membership plan<select name="plan_id" required defaultValue={selectedPlan} className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2">{plans.map((plan) => <option key={plan.plan_id} value={plan.plan_id}>{plan.plan_name} · {plan.classes_per_month} classes · ${Number(plan.monthly_price)}/month</option>)}</select></label>
              </div>
              <Button disabled={!plans.length} className="mt-8 h-12 rounded-none bg-[#c72c25] px-8 text-white hover:bg-[#a9231e] disabled:opacity-40">Submit membership application</Button>
              <p className="mt-4 text-xs leading-5 text-black/50">Submitting does not charge a card or immediately activate a membership. Staff review is required.</p>
            </form>
          )}
          <p className="mt-6 text-sm text-black/55">Already a member? <Link href="/login" className="font-semibold underline">Sign in</Link>.</p>
        </div>
      </section>
    </PublicPage>
  );
}
