import Link from "next/link";

import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";

const links = [
  { href: "/member", label: "Overview" },
  { href: "/member/classes", label: "Class schedule" },
  { href: "/member/reservations", label: "Reservations" },
  { href: "/member/assistant", label: "Pulse Assistant" },
];

type PolicyAnswer = {
  policy_key: string;
  category: string;
  question: string;
  answer: string;
  source_section: string;
};

type MemberContext = {
  member_summary?: {
    member_name?: string;
    classes_remaining?: number;
    classes_per_month?: number;
    plan_name?: string;
  };
  upcoming_reservations?: Array<{ reservation_id: string }>;
};

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ question?: string }>;
}) {
  const { supabase } = await requireMember();
  const { question } = await searchParams;
  const now = new Date().toISOString();

  const [{ data: answers, error }, { data: contextRows }] = await Promise.all([
    supabase
      .from("product_c_policy_answers")
      .select("policy_key,category,question,answer,source_section")
      .order("sort_order", { ascending: true }),
    supabase.rpc("product_c_member_context", { p_from: now, p_as_of: now }),
  ]);

  const policies = (answers ?? []) as PolicyAnswer[];
  const selected = policies.find((answer) => answer.policy_key === question);
  const context = (contextRows?.[0] ?? {}) as MemberContext;
  const member = context.member_summary;
  const reservationCount = context.upcoming_reservations?.length ?? 0;

  return (
    <PortalShell eyebrow="Member portal · Product C" title="Pulse Assistant" description="Approved studio answers and your current membership facts—without inventing policies or changing reservations." links={links}>
      {member && (
        <section className="glass-panel mb-6 grid gap-4 rounded-3xl p-6 sm:grid-cols-2" aria-label="Your live account context">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/50">Credits</p>
            <p className="mt-2 text-xl font-semibold">{member.classes_remaining} of {member.classes_per_month} remaining</p>
            <p className="mt-1 text-sm text-black/55">{member.plan_name}</p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/50">Upcoming</p>
            <p className="mt-2 text-xl font-semibold">{reservationCount} reservation{reservationCount === 1 ? "" : "s"}</p>
            <Link href="/member/reservations" className="mt-1 inline-flex text-sm font-semibold underline underline-offset-4">Manage reservations</Link>
          </div>
        </section>
      )}

      {error ? (
        <div role="alert" className="border border-[#c72c25]/35 bg-[#c72c25]/5 p-6 text-sm text-[#8e211c]">Approved policy answers are temporarily unavailable.</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <section className="glass-panel rounded-3xl p-6">
            <h2 className="text-2xl font-semibold">What can I help with?</h2>
            <div className="mt-5 grid gap-2">
              {policies.map((policy) => (
                <Link
                  key={policy.policy_key}
                  href={`/member/assistant?question=${encodeURIComponent(policy.policy_key)}`}
                  className={`min-h-11 border px-4 py-3 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 ${selected?.policy_key === policy.policy_key ? "border-black bg-black text-white" : "border-black/15 hover:border-black"}`}
                >
                  {policy.question}
                </Link>
              ))}
            </div>
          </section>
          <section className="glass-panel rounded-3xl p-6" aria-live="polite">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/50">Approved answer</p>
            {selected ? (
              <>
                <h2 className="mt-3 text-2xl font-semibold">{selected.question}</h2>
                <p className="mt-4 leading-7 text-black/70">{selected.answer}</p>
                <p className="mt-6 border-t border-black/10 pt-4 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-black/45">Source: {selected.source_section}</p>
              </>
            ) : (
              <p className="mt-4 leading-7 text-black/60">Choose a question to see the studio-approved answer.</p>
            )}
          </section>
        </div>
      )}
    </PortalShell>
  );
}

