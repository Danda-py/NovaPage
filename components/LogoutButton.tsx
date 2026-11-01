"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        router.replace("/login");
        router.refresh();
      }}
      className="inline-flex min-h-9 items-center rounded-lg border border-zinc-800 px-3 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
    >
      Esci
    </button>
  );
}
