import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PublicPage } from "@/components/public-page";
import { FEATURED_MEMBERSHIP_PLAN_ID, publicPlansWithFallback, type PublicMembershipPlan } from "@/lib/public-membership-plans";
import { createClient } from "@/lib/supabase/server";

export default async function MembershipPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("membership_plans").select("plan_id,plan_name,classes_per_month,monthly_price").order("classes_per_month");
  const plans = publicPlansWithFallback((data ?? []) as PublicMembershipPlan[]);
  const orderedPlans = [...plans].sort((a, b) => Number(b.plan_id === FEATURED_MEMBERSHIP_PLAN_ID) - Number(a.plan_id === FEATURED_MEMBERSHIP_PLAN_ID) || a.classes_per_month - b.classes_per_month);
  return (
    <PublicPage compact heroImage="/media/classes/yoga.jpg" heroImageAlt="Pulse Studio yoga class" eyebrow="Membership" title="Make movement a habit." introduction="Choose a monthly rhythm across yoga, cycling, and HIIT. Every plan uses the same schedule, reservation, and credit system.">
      <section className="px-6 py-8 sm:px-10 sm:py-10 lg:px-16 lg:py-12">
        <div className="mx-auto max-w-[90rem]">
          {error ? <p role="status" className="mb-6 inline-flex rounded-full border border-white/60 bg-white/85 px-4 py-2 text-sm text-[#8e211c] shadow-lg backdrop-blur-xl">Showing the approved membership options while live pricing reconnects.</p> : null}
          <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {orderedPlans.map((plan, index) => (
              <Link href={`/join?plan=${encodeURIComponent(plan.plan_id)}`} key={plan.plan_id} className={`group flex h-full min-h-[21rem] flex-col rounded-[1.75rem] border p-5 transition duration-500 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c72c25] motion-reduce:transform-none lg:col-span-1 lg:p-7 ${plan.plan_id === FEATURED_MEMBERSHIP_PLAN_ID ? "border-black/20 bg-[#c72c25] text-white md:col-span-2" : "border-black/15 bg-white/60 hover:bg-white"}`}>
                <div className="flex items-start justify-between gap-4">
                  <span className={`font-mono text-xs tracking-[0.18em] ${plan.plan_id === FEATURED_MEMBERSHIP_PLAN_ID ? "text-white/75" : "text-black/60"}`}>0{index + 1}</span>
                  {plan.plan_id === FEATURED_MEMBERSHIP_PLAN_ID ? <span className="rounded-full border border-white/40 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.14em]">Most popular</span> : null}
                </div>
                <h2 className="mt-7 text-2xl font-semibold tracking-[-0.045em] lg:text-3xl">{plan.plan_name}</h2>
                <p className={`mt-3 text-sm leading-6 ${plan.plan_id === FEATURED_MEMBERSHIP_PLAN_ID ? "text-white/80" : "text-black/65"}`}>{plan.classes_per_month} coached classes every month across Yoga, Cycling, and HIIT.</p>
                <ul className={`mt-5 divide-y text-sm ${plan.plan_id === FEATURED_MEMBERSHIP_PLAN_ID ? "divide-white/20 text-white/80" : "divide-black/10 text-black/65"}`}>
                  <li className="flex gap-3 py-2 before:content-['✓']">Live booking and waitlists</li>
                  <li className="flex gap-3 py-2 before:content-['✓']">Member activity and class history</li>
                  <li className="flex gap-3 py-2 before:content-['✓']">12-hour cancellation window</li>
                </ul>
                <div className="mt-auto pt-7">
                  <p className="text-4xl font-semibold tracking-[-0.05em]">${Number(plan.monthly_price)}<span className={`ml-2 text-sm font-normal tracking-normal ${plan.plan_id === FEATURED_MEMBERSHIP_PLAN_ID ? "text-white/75" : "text-black/60"}`}>/ month</span></p>
                  <span className="mt-6 inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]">Choose membership <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
