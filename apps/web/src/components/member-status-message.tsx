export function MemberStatusMessage({ success, error }: { success?: string; error?: string }) {
  const message = error ?? success;
  if (!message) return null;

  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-4 rounded-2xl border p-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl ${
        error
          ? "border-[#c72c25]/40 bg-[#c72c25]/8 text-[#8e211c]"
          : "border-emerald-700/30 bg-emerald-700/8 text-emerald-900"
      }`}
    >
      {message}
    </div>
  );
}
