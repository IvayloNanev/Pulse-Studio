export default function MemberLoading() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] px-6 py-10 text-[#151515] sm:px-10 lg:px-14 lg:py-14" aria-busy="true" aria-label="Loading member dashboard">
      <p className="sr-only" role="status">Loading your membership, class schedule, and reservations.</p>
      <div className="h-44 max-w-4xl animate-pulse rounded-3xl bg-black/8 motion-reduce:animate-none" />
      <div className="mt-8 h-48 animate-pulse rounded-[2rem] bg-[#171717]/12 motion-reduce:animate-none" />
      <div className="mt-6 h-[34rem] animate-pulse rounded-[2rem] bg-black/8 motion-reduce:animate-none" />
      <div className="mt-6 h-72 animate-pulse rounded-[2rem] bg-[#c72c25]/8 motion-reduce:animate-none" />
    </main>
  );
}
