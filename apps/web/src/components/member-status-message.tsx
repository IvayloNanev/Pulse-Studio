export function MemberStatusMessage({ success, error }: { success?: string; error?: string }) {
  const message = error ?? success;
  if (!message) return null;

  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-6 border p-4 text-sm ${
        error
          ? "border-[#c72c25]/40 bg-[#c72c25]/8 text-[#8e211c]"
          : "border-emerald-700/30 bg-emerald-700/8 text-emerald-900"
      }`}
    >
      {message}
    </div>
  );
}

