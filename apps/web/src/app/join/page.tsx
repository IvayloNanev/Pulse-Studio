import Link from "next/link";
import { Check, CreditCard, Dumbbell, ShieldCheck } from "lucide-react";

import { submitMembershipApplication } from "@/app/join/actions";
import { MemberStatusMessage } from "@/components/member-status-message";
import { PublicPage } from "@/components/public-page";
import { JoinSubmitButton } from "@/components/join-submit-button";
import { PublicPlanSelect } from "@/components/public-plan-select";
import { publicPlansWithFallback, type PublicMembershipPlan } from "@/lib/public-membership-plans";
import { createClient } from "@/lib/supabase/server";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ plan?: string; success?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.from("membership_plans").select("plan_id,plan_name,classes_per_month,monthly_price").order("classes_per_month");
  const plans = publicPlansWithFallback((data ?? []) as PublicMembershipPlan[]);
  const selectedPlan = plans.some((plan) => plan.plan_id === params.plan) ? params.plan : plans[0]?.plan_id;
  const selectedPlanDetails = plans.find((plan) => plan.plan_id === selectedPlan) ?? plans[0];
  const fieldClass = "mt-2 h-12 w-full rounded-xl border border-black/15 bg-white/70 px-4 shadow-sm transition focus-visible:border-[#c72c25] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c72c25]";

  return (
    <PublicPage compact heroImage="/media/classes/hiit.jpg" heroImageAlt="Pulse Studio HIIT class" eyebrow="Join Pulse" title="Begin with intention." introduction="Choose your rhythm and submit your membership application. Applications are accepted automatically; secure member-account setup is a separate step.">
      <section className="relative overflow-hidden px-6 py-12 sm:px-10 lg:px-16 lg:py-20">
        <div className="pointer-events-none absolute -left-32 top-20 size-96 rounded-full bg-[#c72c25]/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-[90rem] gap-6 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)] lg:items-start">
          <aside className="overflow-hidden rounded-[2rem] bg-[#171717] text-white shadow-2xl lg:sticky lg:top-28">
            <div className="border-b border-white/15 bg-[radial-gradient(circle_at_top_right,rgba(199,44,37,0.55),transparent_48%)] p-7 sm:p-9">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/70">Your membership</p>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.045em]">{selectedPlanDetails.plan_name}</h2>
              <p className="mt-3 text-sm leading-6 text-white/70">{selectedPlanDetails.classes_per_month} coached Yoga, Cycling, or HIIT classes each month.</p>
              <p className="mt-8 text-5xl font-semibold tracking-[-0.06em]">${Number(selectedPlanDetails.monthly_price)}<span className="ml-2 text-sm font-normal tracking-normal text-white/60">/ month</span></p>
              <Link href="/membership" className="mt-5 inline-flex min-h-11 items-center text-xs font-bold uppercase tracking-[0.14em] text-white underline decoration-white/40 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Compare memberships</Link>
            </div>
            <div className="space-y-6 p-7 sm:p-9">
              {[
                [Dumbbell, "Choose your training rhythm", "Your plan works across every Pulse discipline."],
                [CreditCard, "Add a test payment method", "No real charge is processed or stored."],
                [ShieldCheck, "Accepted automatically", "No staff review is required. Account sign-in is set up separately."],
              ].map(([Icon, title, detail], index) => (
                <div key={String(title)} className="grid grid-cols-[2.75rem_1fr] gap-4">
                  <span className="flex size-11 items-center justify-center rounded-full border border-white/20 bg-white/10"><Icon className="size-5 text-[#ff5b52]" aria-hidden="true" /></span>
                  <div><p className="text-sm font-semibold"><span className="mr-2 font-mono text-xs text-white/45">0{index + 1}</span>{String(title)}</p><p className="mt-1 text-xs leading-5 text-white/65">{String(detail)}</p></div>
                </div>
              ))}
            </div>
          </aside>

          <div className="glass-panel rounded-[2rem] border border-white/70 bg-white/55 p-6 shadow-[0_30px_80px_rgba(40,30,20,0.13)] backdrop-blur-xl sm:p-9 lg:p-11">
            <div className="mb-8 flex items-start justify-between gap-5 border-b border-black/10 pb-7">
              <div><p className="font-mono text-xs uppercase tracking-[0.2em] text-[#a9231e]">Secure enrollment</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">Create your Pulse profile.</h2></div>
              <span className="hidden size-12 items-center justify-center rounded-full bg-[#c72c25] text-white sm:flex"><Check className="size-5" aria-hidden="true" /></span>
            </div>
          <MemberStatusMessage success={params.success} error={params.error ?? error?.message} />
          {!params.success && (
            <form action={submitMembershipApplication}>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="text-sm font-medium">First name<input name="first_name" autoComplete="given-name" required className={fieldClass} /></label>
                <label className="text-sm font-medium">Last name<input name="last_name" autoComplete="family-name" required className={fieldClass} /></label>
                <label className="text-sm font-medium sm:col-span-2">Email address<input name="email" type="email" autoComplete="email" required className={fieldClass} /></label>
                <label className="text-sm font-medium sm:col-span-2">Phone number <span className="font-normal text-black/60">(optional)</span><input name="phone" type="tel" autoComplete="tel" className={fieldClass} /></label>
                <label className="text-sm font-medium sm:col-span-2">Membership plan<PublicPlanSelect key={selectedPlan} plans={plans} initialPlanId={selectedPlan ?? plans[0].plan_id} className={fieldClass} /></label>
                <fieldset className="grid gap-6 rounded-2xl border border-black/10 bg-[#eee6dc]/70 p-5 sm:col-span-2 sm:grid-cols-2"><legend className="px-2 text-sm font-semibold">Simulated payment method</legend><p className="text-xs leading-5 text-black/60 sm:col-span-2">Use test information only. Pulse stores the brand, last four digits, expiration, and billing ZIP—never the full number or security code.</p><label className="text-sm font-medium sm:col-span-2">Cardholder name<input name="cardholder_name" autoComplete="cc-name" required className={fieldClass} /></label><label className="text-sm font-medium">Card brand<select name="card_brand" required defaultValue="visa" className={fieldClass}><option value="visa">Visa</option><option value="mastercard">Mastercard</option><option value="amex">American Express</option></select></label><label className="text-sm font-medium">Test card number<input name="card_number" inputMode="numeric" autoComplete="cc-number" pattern="[0-9 ]{15,19}" required placeholder="4242 4242 4242 4242" aria-describedby="test-card-help" className={fieldClass} /><span id="test-card-help" className="mt-2 block text-xs leading-5 text-black/60">Enter 15–16 digits. Spaces are allowed.</span></label><label className="text-sm font-medium">Expiration month<input name="expiration_month" type="number" inputMode="numeric" min="1" max="12" required placeholder="12" className={fieldClass} /></label><label className="text-sm font-medium">Expiration year<input name="expiration_year" type="number" inputMode="numeric" min="2026" max="2100" required placeholder="2030" className={fieldClass} /></label><label className="text-sm font-medium">Security code<input name="security_code" type="password" inputMode="numeric" autoComplete="cc-csc" pattern="[0-9]{3,4}" required placeholder="123" className={fieldClass} /></label><label className="text-sm font-medium">Billing ZIP<input name="billing_zip" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}(-[0-9]{4})?" required placeholder="10001" className={fieldClass} /></label></fieldset>
              </div>
              <JoinSubmitButton />
              <p className="mt-4 text-xs leading-5 text-black/60">Your application is accepted automatically and creates a simulated payment method. No real charge is processed. Member login becomes available only after secure account setup.</p>
            </form>
          )}
          {error ? <p className="mt-4 text-xs leading-5 text-black/60">Live pricing is reconnecting, so the approved Pulse membership options are shown.</p> : null}
          <p className="mt-6 text-sm text-black/60">Already a member? <Link href="/login" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c72c25]">Sign in</Link>.</p>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
