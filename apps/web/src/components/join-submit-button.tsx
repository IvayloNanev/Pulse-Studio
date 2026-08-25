"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function JoinSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} aria-busy={pending} className="mt-8 h-13 w-full rounded-full bg-[#c72c25] px-8 text-white shadow-lg shadow-[#c72c25]/20 hover:bg-[#a9231e] disabled:cursor-wait sm:w-auto">
      {pending ? "Submitting application…" : "Submit membership application"}
    </Button>
  );
}
