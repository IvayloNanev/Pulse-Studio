export default function MemberLoading() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] pb-24 text-[#151515] lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:pb-0 xl:grid-cols-[17rem_minmax(0,1fr)]" aria-busy="true" aria-label="Loading member portal">
      <p className="sr-only" role="status">Loading your membership, class schedule, and reservations.</p>
      <aside className="hidden min-h-screen bg-[#171717] p-6 lg:block"><div className="h-12 w-40 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" /><div className="mt-10 space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-11 animate-pulse rounded-xl bg-white/8 motion-reduce:animate-none" />)}</div></aside>
      <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:px-10 2xl:px-12"><div className="mx-auto w-full max-w-[90rem]">
        <div className="h-40 animate-pulse rounded-3xl bg-[#171717]/12 motion-reduce:animate-none" />
        <div className="mt-5 grid gap-5 xl:grid-cols-2"><div className="h-80 animate-pulse rounded-3xl bg-black/8 motion-reduce:animate-none" /><div className="h-80 animate-pulse rounded-3xl bg-[#c72c25]/8 motion-reduce:animate-none" /></div>
        <div className="mt-5 h-56 animate-pulse rounded-3xl bg-black/8 motion-reduce:animate-none" />
      </div></div>
    </main>
  );
}
