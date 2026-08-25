"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { PublicMembershipPlan } from "@/lib/public-membership-plans";

export function PublicPlanSelect({ plans, initialPlanId, className }: { plans: PublicMembershipPlan[]; initialPlanId: string; className: string }) {
  const router = useRouter();
  const [planId, setPlanId] = useState(initialPlanId);
  const [isUpdating, startTransition] = useTransition();

  return (
    <select
      name="plan_id"
      required
      value={planId}
      aria-busy={isUpdating}
      onChange={(event) => {
        const nextPlanId = event.target.value;
        setPlanId(nextPlanId);
        startTransition(() => router.replace(`/join?plan=${encodeURIComponent(nextPlanId)}`, { scroll: false }));
      }}
      className={className}
    >
      {plans.map((plan) => <option key={plan.plan_id} value={plan.plan_id}>{plan.plan_name} · {plan.classes_per_month} classes · ${Number(plan.monthly_price)}/month</option>)}
    </select>
  );
}
