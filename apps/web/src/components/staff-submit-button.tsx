"use client";

import { useFormStatus } from "react-dom";

export function StaffSubmitButton({
  children,
  pendingLabel,
  disabled = false,
  tone = "primary",
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  disabled?: boolean;
  tone?: "primary" | "danger" | "secondary";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const tones = {
    primary: "bg-black text-white hover:bg-[#c72c25]",
    danger: "border border-black/20 bg-white/55 text-[#a9231e] hover:border-[#a9231e]",
    secondary: "border border-black bg-white/55 text-black hover:bg-black hover:text-white",
  };

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-35 ${tones[tone]} ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
