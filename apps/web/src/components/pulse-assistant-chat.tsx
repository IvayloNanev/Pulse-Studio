"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { answerGroundedPulseQuestion, type PulseMemberContext, type PulsePolicy } from "@/lib/pulse-assistant-grounding";

type ChatMessage = { id: number; role: "member" | "assistant"; text: string };

export function PulseAssistantChat() {
  const searchParams = useSearchParams();
  const initiallyOpen = searchParams.get("assistant") === "open";
  const [open, setOpen] = useState(initiallyOpen);
  const [policies, setPolicies] = useState<PulsePolicy[]>([]);
  const [context, setContext] = useState<PulseMemberContext | null>(null);
  const [loading, setLoading] = useState(initiallyOpen);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 1, role: "assistant", text: "Hi — I’m Pulse Assistant. Ask me about classes, preparation, booking, cancellations, or your membership." }]);
  const nextId = useRef(2);
  const conversation = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const requested = useRef(false);

  useEffect(() => {
    if (!open || requested.current) return;
    requested.current = true;
    fetch("/api/member/assistant")
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Assistant unavailable."); return payload; })
      .then((payload) => { setPolicies(payload.policies ?? []); setContext(payload.context ?? null); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Assistant unavailable."))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => inputRef.current?.focus(), 0);
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        window.setTimeout(() => openerRef.current?.focus(), 0);
        return;
      }
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = window.requestAnimationFrame(() => conversation.current?.scrollTo({ top: conversation.current.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" }));
    return () => window.cancelAnimationFrame(frame);
  }, [messages]);
  const suggestions = useMemo(() => policies.slice(0, 4), [policies]);

  function answerPolicy(policy: PulsePolicy) {
    setMessages((current) => [...current, { id: nextId.current++, role: "member", text: policy.question }, { id: nextId.current++, role: "assistant", text: policy.answer }]);
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;
    const response = answerGroundedPulseQuestion(question, policies, context);
    setMessages((current) => [...current, { id: nextId.current++, role: "member", text: question }, { id: nextId.current++, role: "assistant", text: response }]);
    setInput("");
  }

  return <>
    <button ref={openerRef} type="button" onClick={() => { if (!requested.current) setLoading(true); setOpen(true); }} aria-label="Open Pulse Assistant" className="fixed bottom-24 right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#c72c25] px-4 font-semibold text-white shadow-[0_1rem_2.5rem_rgba(99,20,17,0.32)] transition hover:bg-[#a9231e] focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 sm:right-5 sm:px-5 lg:bottom-5"><MessageCircle className="size-5" aria-hidden="true" /><span className="hidden sm:inline">Pulse Assistant</span></button>
    {open ? <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="pulse-assistant-title" className="fixed inset-3 z-50 flex h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-3xl border border-white/70 bg-[rgba(247,244,238,0.92)] shadow-[0_1.5rem_5rem_rgba(17,17,17,0.28),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(46rem,calc(100dvh-2.5rem))] sm:w-[26rem] lg:w-[28rem]">
      <header className="shrink-0 border-b border-black/10 bg-[#171717] px-5 py-4 text-white"><div className="flex items-center justify-between"><div><p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-white/65">Member support</p><h2 id="pulse-assistant-title" className="mt-1 text-lg font-semibold">Pulse Assistant</h2></div><button type="button" onClick={() => { setOpen(false); window.setTimeout(() => openerRef.current?.focus(), 0); }} aria-label="Close Pulse Assistant" className="inline-flex size-11 items-center justify-center rounded-full border border-white/20 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"><X className="size-5" aria-hidden="true" /></button></div><p className="mt-1 flex items-center gap-2 text-xs text-white/65"><span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />Approved studio answers</p></header>
      <div ref={conversation} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4" aria-live="polite" aria-label="Conversation"><div className="space-y-3">{messages.map((message) => <div key={message.id} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${message.role === "member" ? "ml-auto rounded-br-md bg-[#c72c25] text-white" : "mr-auto rounded-bl-md border border-white/80 bg-white/75 text-black"}`}>{message.text}</div>)}</div>{loading ? <p className="mt-4 text-sm text-black/60">Loading approved studio answers…</p> : null}{error ? <p role="alert" className="mt-4 rounded-xl bg-[#c72c25]/8 p-3 text-sm text-[#8e211c]">{error}</p> : null}{messages.length === 1 && suggestions.length ? <div className="mt-5 border-t border-black/10 pt-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/55">Start with a question</p><div className="mt-2 grid gap-2">{suggestions.map((policy) => <button key={policy.policy_key} type="button" onClick={() => answerPolicy(policy)} className="min-h-11 rounded-2xl border border-black/15 bg-white/65 px-3 py-2 text-left text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">{policy.question}</button>)}</div></div> : null}</div>
      <form onSubmit={submitQuestion} className="grid shrink-0 grid-cols-[minmax(0,1fr)_3rem] gap-2 border-t border-black/10 bg-white/70 p-3 backdrop-blur-xl"><label className="sr-only" htmlFor="pulse-question">Ask Pulse Assistant</label><input ref={inputRef} id="pulse-question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Message Pulse Assistant…" autoComplete="off" className="min-h-12 min-w-0 rounded-full border border-black/15 bg-white/85 px-4 text-sm focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2" /><button type="submit" disabled={!input.trim() || loading || !!error} aria-label="Send question" className="inline-flex size-12 items-center justify-center rounded-full bg-black text-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:opacity-35"><Send className="size-4" aria-hidden="true" /></button></form>
    </section> : null}
  </>;
}
