import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

type LoginPanelProps = {
  audience: "member" | "staff";
};

export function LoginPanel({ audience }: LoginPanelProps) {
  const isStaff = audience === "staff";

  return (
    <section className="grid min-h-screen bg-[#f3f0e9] text-[#111] lg:grid-cols-2">
      <div className="flex min-h-[18rem] flex-col justify-between bg-[#171717] p-8 text-white sm:p-12 lg:p-16">
        <Brand inverse prominent />
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">
            {isStaff ? "Private staff access" : "Member access"}
          </p>
          <h1 className="mt-5 max-w-xl font-heading text-5xl leading-[0.9] tracking-[-0.055em] sm:text-7xl">
            {isStaff ? "Run the studio with clarity." : "Return to your practice."}
          </h1>
        </div>
      </div>
      <div className="relative flex items-center overflow-hidden bg-[linear-gradient(135deg,#b9b2aa_0%,#eeeae3_38%,#d4cdc4_68%,#a7a09a_100%)] px-6 py-14 sm:px-12 lg:px-20">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_10%,rgba(255,255,255,0.48)_42%,transparent_68%)]" />
        <div className="glass-panel relative w-full max-w-lg rounded-[2rem] p-7 sm:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-black/45">Secure sign in</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Welcome back</h2>
          <form className="mt-10 space-y-6">
            <label className="block text-sm font-medium">
              Email address
              <input type="email" autoComplete="email" className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 outline-none focus:border-black" />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input type="password" autoComplete="current-password" className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 outline-none focus:border-black" />
            </label>
            <Button type="submit" className="h-12 w-full rounded-none bg-[#c72c25] text-white hover:bg-[#a9231e]">
              Sign in as {isStaff ? "staff" : "member"}
            </Button>
          </form>
          <p className="mt-6 text-xs leading-5 text-black/50">
            Authentication will be connected to the project&apos;s Supabase accounts in the next implementation step.
          </p>
        </div>
      </div>
    </section>
  );
}
