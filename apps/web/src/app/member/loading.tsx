export default function MemberLoading() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] pb-24 text-[#151515] lg:pb-0" aria-busy="true" aria-label="Loading member portal">
      <p className="sr-only" role="status">Loading your membership, class schedule, and reservations.</p>
      <header className="sticky top-0 z-50 hidden min-h-20 items-center border-b border-black/15 bg-[#f3f0e9] px-8 lg:flex xl:px-10">
        <div className="flex w-full items-center gap-6">
          <div className="h-11 w-44 animate-pulse rounded-full bg-black/8 motion-reduce:animate-none" />
          <div className="ml-auto flex min-w-0 gap-2">
            {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-11 w-24 animate-pulse rounded-full bg-black/8 motion-reduce:animate-none" />)}
          </div>
          <div className="h-11 w-24 animate-pulse rounded-full bg-black/10 motion-reduce:animate-none" />
        </div>
      </header>
      <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:px-10 2xl:px-12"><div className="mx-auto w-full max-w-[90rem]">
        <div className="h-40 animate-pulse rounded-3xl bg-[#171717]/12 motion-reduce:animate-none" />
        <div className="mt-5 grid gap-5 xl:grid-cols-2"><div className="h-80 animate-pulse rounded-3xl bg-black/8 motion-reduce:animate-none" /><div className="h-80 animate-pulse rounded-3xl bg-[#c72c25]/8 motion-reduce:animate-none" /></div>
        <div className="mt-5 h-56 animate-pulse rounded-3xl bg-black/8 motion-reduce:animate-none" />
      </div></div>
    </main>
  );
}
