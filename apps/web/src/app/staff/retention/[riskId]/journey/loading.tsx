export default function StaffRetentionJourneyLoading() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-8 sm:px-6 lg:px-10" aria-busy="true" aria-label="Loading case journey">
      <div className="mx-auto w-full max-w-[90rem] animate-pulse motion-reduce:animate-none">
        <div className="h-11 w-44 rounded-full bg-black/10" />
        <div className="mt-6 h-48 rounded-3xl bg-black/10" />
        <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="h-32 rounded-3xl bg-black/10" /><div className="h-32 rounded-3xl bg-black/10" /></div>
        <div className="mt-5 h-72 rounded-3xl bg-black/10" />
      </div>
    </main>
  );
}
