import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PublicPage } from "@/components/public-page";

const plans = [
  { name: "Essential", classes: "4 classes / month", price: "$129" },
  { name: "Commit", classes: "8 classes / month", price: "$219" },
  { name: "Unlimited", classes: "Unlimited monthly access", price: "$289" },
];

export default function MembershipPage() {
  return (
    <PublicPage eyebrow="Membership" title="A practice that keeps pace." introduction="Choose a monthly rhythm across yoga, cycling, and HIIT. Every plan uses the same schedule, reservation, and credit system.">
      <section className="px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="border-t border-black/20">
          {plans.map((plan, index) => (
            <Link href="/join" key={plan.name} className="group grid gap-4 border-b border-black/20 py-8 md:grid-cols-[4rem_1fr_1fr_auto] md:items-center">
              <span className="font-mono text-xs text-black/45">0{index + 1}</span>
              <span className="text-3xl font-semibold tracking-[-0.04em]">{plan.name}</span>
              <span className="text-sm text-black/55">{plan.classes}</span>
              <span className="flex items-center gap-5 text-xl font-semibold">{plan.price}<ArrowRight className="size-5 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>
    </PublicPage>
  );
}
