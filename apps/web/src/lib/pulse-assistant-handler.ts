import { NextResponse } from "next/server";

import {
  answerGroundedPulseQuestion,
  isDeterministicMemberFactQuestion,
  resolvePulseFollowUpQuestion,
  type PulseConversationTurn,
  type PulseMemberContext,
  type PulsePolicy,
} from "@/lib/pulse-assistant-grounding";

export type AssistantQuota = { allowed?: boolean; retry_after_seconds?: number; remaining?: number };
export type AssistantGrounding = { policies: PulsePolicy[]; context: PulseMemberContext };
type AssistantAuthentication<TSupabase> = { error?: Response; supabase?: TSupabase };
type AssistantPostDependencies<TSupabase> = {
  authenticate: () => Promise<AssistantAuthentication<TSupabase>>;
  consumeQuota: (supabase: TSupabase, bucket: "request" | "model") => Promise<AssistantQuota>;
  loadGrounding: (supabase: TSupabase) => Promise<AssistantGrounding>;
  gatewayEnabled: () => boolean;
  generateAnswer: (question: string, grounding: AssistantGrounding, fallback: string) => Promise<string | null>;
};

export function numericClaimsAreGrounded(answer: string, evidence: unknown) {
  const numbers = answer.match(/\$?\d+(?:\.\d+)?/g) ?? [];
  const evidenceNumbers = new Set(
    (JSON.stringify(evidence).match(/\d+(?:\.\d+)?/g) ?? [])
      .map((number) => Number(number).toString()),
  );
  return numbers.every((number) => evidenceNumbers.has(Number(number.replace("$", "")).toString()));
}

export function createAssistantPostHandler<TSupabase>(dependencies: AssistantPostDependencies<TSupabase>) {
  return async function assistantPost(request: Request) {
    const authentication = await dependencies.authenticate();
    if (authentication.error) return authentication.error;
    if (!authentication.supabase) {
      return NextResponse.json({ error: "Member access required." }, { status: 403 });
    }

    const payload = await request.json().catch(() => null);
    const question = typeof payload?.question === "string" ? payload.question.trim() : "";
    const conversation: PulseConversationTurn[] = Array.isArray(payload?.conversation)
      ? payload.conversation
        .slice(-6)
        .filter((turn: unknown): turn is Record<string, unknown> => Boolean(turn) && typeof turn === "object")
        .map((turn: Record<string, unknown>) => ({
          role: turn.role === "assistant" ? "assistant" as const : "member" as const,
          text: typeof turn.text === "string" ? turn.text.trim().slice(0, 500) : "",
        }))
        .filter((turn: PulseConversationTurn) => Boolean(turn.text))
      : [];
    if (!question || question.length > 500) {
      return NextResponse.json({ error: "Ask one question using 500 characters or fewer." }, { status: 400 });
    }
    const resolvedQuestion = resolvePulseFollowUpQuestion(question, conversation);

    let requestQuota: AssistantQuota;
    try {
      requestQuota = await dependencies.consumeQuota(authentication.supabase, "request");
    } catch {
      return NextResponse.json({ error: "Pulse Assistant protection is temporarily unavailable." }, { status: 503 });
    }
    if (!requestQuota.allowed) {
      return NextResponse.json(
        { error: "You’re asking questions too quickly. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(requestQuota.retry_after_seconds ?? 60) } },
      );
    }

    let grounding: AssistantGrounding;
    try {
      grounding = await dependencies.loadGrounding(authentication.supabase);
    } catch {
      return NextResponse.json({ error: "Approved studio answers are temporarily unavailable." }, { status: 503 });
    }

    const fallback = answerGroundedPulseQuestion(resolvedQuestion, grounding.policies, grounding.context);
    if (resolvedQuestion !== question || isDeterministicMemberFactQuestion(resolvedQuestion)) {
      return NextResponse.json({ answer: fallback, mode: "deterministic" });
    }
    if (!dependencies.gatewayEnabled()) {
      return NextResponse.json({ answer: fallback, mode: "deterministic" });
    }

    try {
      const modelQuota = await dependencies.consumeQuota(authentication.supabase, "model");
      if (!modelQuota.allowed) {
        return NextResponse.json({ answer: fallback, mode: "deterministic", limit: "daily-model-budget" });
      }
    } catch {
      return NextResponse.json({ answer: fallback, mode: "deterministic", limit: "quota-unavailable" });
    }

    try {
      const answer = await dependencies.generateAnswer(question, grounding, fallback);
      return NextResponse.json({ answer: answer ?? fallback, mode: answer ? "llm" : "deterministic" });
    } catch (error) {
      console.error("Pulse Assistant model generation failed", error);
      return NextResponse.json({ answer: fallback, mode: "deterministic" });
    }
  };
}
