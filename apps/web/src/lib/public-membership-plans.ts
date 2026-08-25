export type PublicMembershipPlan = {
  plan_id: string;
  plan_name: string;
  classes_per_month: number;
  monthly_price: number;
};

export const FEATURED_MEMBERSHIP_PLAN_ID = "PLAN-008";

export const APPROVED_MEMBERSHIP_PLANS: PublicMembershipPlan[] = [
  { plan_id: "PLAN-004", plan_name: "4 Classes Monthly", classes_per_month: 4, monthly_price: 99 },
  { plan_id: "PLAN-008", plan_name: "8 Classes Monthly", classes_per_month: 8, monthly_price: 179 },
  { plan_id: "PLAN-012", plan_name: "12 Classes Monthly", classes_per_month: 12, monthly_price: 249 },
];

export function publicPlansWithFallback(plans: PublicMembershipPlan[] | null | undefined) {
  return plans?.length ? plans : APPROVED_MEMBERSHIP_PLANS;
}
