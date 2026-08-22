import Link from "next/link";

import { PublicPage } from "@/components/public-page";
import { Button } from "@/components/ui/button";

export default function JoinPage() {
  return (
    <PublicPage eyebrow="Join Pulse" title="Begin with intention." introduction="Create your membership profile and choose a monthly plan. This foundation form will connect to the membership workflow after authentication is implemented.">
      <section className="px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="max-w-2xl border-t border-black/20 pt-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="text-sm font-medium">First name<input className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3" /></label>
            <label className="text-sm font-medium">Last name<input className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3" /></label>
            <label className="text-sm font-medium sm:col-span-2">Email address<input type="email" className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3" /></label>
          </div>
          <Button className="mt-8 h-12 rounded-none bg-[#c72c25] px-8 text-white hover:bg-[#a9231e]">Continue to plans</Button>
          <p className="mt-6 text-sm text-black/55">Already a member? <Link href="/login" className="font-semibold underline">Sign in</Link>.</p>
        </div>
      </section>
    </PublicPage>
  );
}
