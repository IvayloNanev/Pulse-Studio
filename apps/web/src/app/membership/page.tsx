import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PublicPage } from "@/components/public-page";
import { createClient } from "@/lib/supabase/server";

type Plan = { plan_id: string; plan_name: string; classes_per_month: number; monthly_price: number };

export default async function MembershipPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("membership_plans").select("plan_id,plan_name,classes_per_month,monthly_price").order("classes_per_month");
  const plans = (data ?? []) as Plan[];
  return (
    <PublicPage eyebrow="Membership" title="A practice that keeps pace." introduction="Choose a monthly rhythm across yoga, cycling, and HIIT. Every plan uses the same schedule, reservation, and credit system.">
      <section className="px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="border-t border-black/20">
          {error ? <div role="alert" className="border-b border-black/20 py-8 text-sm text-[#8e211c]">Membership plans are temporarily unavailable.</div> : plans.map((plan, index) => (
            <Link href={`/join?plan=${encodeURIComponent(plan.plan_id)}`} key={plan.plan_id} className="group grid gap-4 border-b border-black/20 py-8 md:grid-cols-[4rem_1fr_1fr_auto] md:items-center">
              <span className="font-mono text-xs text-black/45">0{index + 1}</span>
              <span className="text-3xl font-semibold tracking-[-0.04em]">{plan.plan_name}</span>
              <span className="text-sm text-black/55">{plan.classes_per_month} classes / month</span>
              <span className="flex items-center gap-5 text-xl font-semibold">${Number(plan.monthly_price)} / month<ArrowRight className="size-5 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>
    </PublicPage>
  );
}
