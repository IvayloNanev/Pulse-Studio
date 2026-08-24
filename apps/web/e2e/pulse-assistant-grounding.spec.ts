import { expect, test } from "@playwright/test";

import {
  answerGroundedPulseQuestion,
  cleanAssistantText,
  type PulseMemberContext,
  type PulsePolicy,
} from "../src/lib/pulse-assistant-grounding";

const policies: PulsePolicy[] = [
  {
    policy_key: "late-cancellation",
    category: "cancellations",
    question: "What is the cancellation policy?",
    answer: "Cancel at least 12 hours before class to have an eligible credit returned.",
  },
];

const context: PulseMemberContext = {
  member_summary: {
    member_name: "Lena Ortiz",
    membership_status: "active",
    plan_name: "Studio Eight",
    classes_remaining: 3,
    classes_reserved: 2,
    billing_cycle_end_at: "2026-09-01T04:00:00.000Z",
  },
  upcoming_reservations: [
    {
      class_type_label: "Yoga",
      instructor_name: "Maya Chen",
      starts_at: "2026-08-26T22:00:00.000Z",
      reservation_status: "confirmed",
    },
  ],
  activity_stats: { total_check_ins: 42, classes_this_month: 6 },
  recent_activity: [
    {
      attendance_status: "attended",
      class_type_label: "Cycling",
      instructor_name: "Andre Lewis",
      starts_at: "2026-08-22T13:00:00.000Z",
    },
  ],
  availability: { membership: true, activity: true },
};

test("answers credit questions from member context", () => {
  expect(answerGroundedPulseQuestion("How many credits do I have left?", policies, context)).toBe(
    "You have 3 classes available and 2 currently reserved in your present billing cycle.",
  );
});

test("answers attendance questions with lifetime and current-month totals", () => {
  expect(answerGroundedPulseQuestion("How many classes have I attended this month?", policies, context)).toBe(
    "You have 42 total check-ins, including 6 classes attended this month.",
  );
});

test("answers recent activity questions with the latest attended class", () => {
  const answer = answerGroundedPulseQuestion("What was my last class?", policies, context);
  expect(answer).toContain("Cycling with Andre Lewis");
  expect(answer).toContain("Saturday, August 22");
});

test("answers upcoming reservation questions from member context", () => {
  const answer = answerGroundedPulseQuestion("What is my next class?", policies, context);
  expect(answer).toContain("next reserved class is Yoga with Maya Chen");
  expect(answer).toContain("Wednesday, August 26");
});

test("combines credits and the next reservation for compound questions", () => {
  const answer = answerGroundedPulseQuestion(
    "How many classes do I have available, and what is my next reserved class?",
    policies,
    context,
  );
  expect(answer).toContain("3 classes available and 2 currently reserved");
  expect(answer).toContain("next reserved class is Yoga with Maya Chen");
  expect(answer).toContain("Wednesday, August 26");
});

test("answers membership questions from member context", () => {
  const answer = answerGroundedPulseQuestion("What is my membership status?", policies, context);
  expect(answer).toContain("Studio Eight membership is active");
  expect(answer).toContain("September 1");
});

test("uses approved policy answers for policy questions", () => {
  expect(answerGroundedPulseQuestion("Can you explain cancellations?", policies, context)).toBe(policies[0].answer);
});

test("does not invent unavailable membership data", () => {
  const unavailable = { ...context, member_summary: undefined, availability: { membership: false, activity: true } };
  expect(answerGroundedPulseQuestion("How many credits do I have?", policies, unavailable)).toContain("I won’t guess");
});

test("does not invent unavailable activity data", () => {
  const unavailable = { ...context, activity_stats: null, availability: { membership: true, activity: false } };
  expect(answerGroundedPulseQuestion("How many check-ins do I have?", policies, unavailable)).toContain("I won’t guess");
});

test("uses a bounded fallback for unsupported questions", () => {
  expect(answerGroundedPulseQuestion("What is the weather in Paris?", policies, context)).toContain(
    "I don’t have an approved answer",
  );
});

test("removes model formatting markers from member-facing answers", () => {
  expect(cleanAssistantText("You have **5 classes available** and `2 reserved`."))
    .toBe("You have 5 classes available and 2 reserved.");
});
