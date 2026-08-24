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
    <PublicPage eyebrow="Join Pulse" title="Begin with intention." introduction="Choose a membership and submit your application with a simulated payment method. No real charge is processed.">
      <section className="px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="max-w-2xl border-t border-black/20 pt-8">
          <MemberStatusMessage success={params.success} error={params.error ?? error?.message} />
          {!params.success && !error && (
            <form action={submitMembershipApplication}>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="text-sm font-medium">First name<input name="first_name" autoComplete="given-name" required className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2" /></label>
                <label className="text-sm font-medium">Last name<input name="last_name" autoComplete="family-name" required className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2" /></label>
                <label className="text-sm font-medium sm:col-span-2">Email address<input name="email" type="email" autoComplete="email" required className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2" /></label>
                <label className="text-sm font-medium sm:col-span-2">Phone number <span className="font-normal text-black/60">(optional)</span><input name="phone" type="tel" autoComplete="tel" className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2" /></label>
                <label className="text-sm font-medium sm:col-span-2">Membership plan<select name="plan_id" required defaultValue={selectedPlan} className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2">{plans.map((plan) => <option key={plan.plan_id} value={plan.plan_id}>{plan.plan_name} · {plan.classes_per_month} classes · ${Number(plan.monthly_price)}/month</option>)}</select></label>
                <fieldset className="grid gap-6 border-t border-black/20 pt-6 sm:col-span-2 sm:grid-cols-2"><legend className="px-2 text-sm font-semibold">Simulated payment method</legend><p className="text-xs leading-5 text-black/60 sm:col-span-2">Use test information only. Pulse stores the brand, last four digits, expiration, and billing ZIP—never the full number or security code.</p><label className="text-sm font-medium sm:col-span-2">Cardholder name<input name="cardholder_name" autoComplete="cc-name" required className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2" /></label><label className="text-sm font-medium">Card brand<select name="card_brand" required defaultValue="visa" className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2"><option value="visa">Visa</option><option value="mastercard">Mastercard</option><option value="amex">American Express</option></select></label><label className="text-sm font-medium">Test card number<input name="card_number" inputMode="numeric" autoComplete="cc-number" pattern="[0-9 ]{15,19}" required placeholder="4242 4242 4242 4242" className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2" /></label><label className="text-sm font-medium">Expiration month<input name="expiration_month" type="number" inputMode="numeric" min="1" max="12" required placeholder="12" className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2" /></label><label className="text-sm font-medium">Expiration year<input name="expiration_year" type="number" inputMode="numeric" min="2026" max="2100" required placeholder="2030" className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2" /></label><label className="text-sm font-medium">Security code<input name="security_code" type="password" inputMode="numeric" autoComplete="cc-csc" pattern="[0-9]{3,4}" required placeholder="123" className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2" /></label><label className="text-sm font-medium">Billing ZIP<input name="billing_zip" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}(-[0-9]{4})?" required placeholder="10001" className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:outline-2" /></label></fieldset>
              </div>
              <Button disabled={!plans.length} className="mt-8 h-12 rounded-none bg-[#c72c25] px-8 text-white hover:bg-[#a9231e] disabled:opacity-40">Submit membership application</Button>
              <p className="mt-4 text-xs leading-5 text-black/60">Submitting creates a simulated payment method but does not process a real charge or immediately activate a membership. Staff review is required.</p>
            </form>
          )}
          <p className="mt-6 text-sm text-black/55">Already a member? <Link href="/login" className="font-semibold underline">Sign in</Link>.</p>
        </div>
      </section>
    </PublicPage>
  );
}
