"use client";

export default function StaffError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div role="alert" className="glass-panel rounded-3xl p-8">
        <h2 className="text-2xl font-semibold">Studio operations could not be loaded</h2>
        <p className="mt-2 text-sm text-black/60">Your access is unchanged. Try loading the command center again.</p>
        <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-full bg-black px-5 text-sm font-semibold text-white">Try again</button>
      </div>
    </div>
  );
}
