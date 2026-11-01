export const instant = false;
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Brand } from "@/components/Brand";

export const metadata = { title: "Accedi", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { next } = await searchParams;
  // Solo percorsi interni: "//evil.com" inizia con "/" ma è un URL esterno, e
  // dopo il login diventerebbe un redirect verso un altro sito.
  const target =
    next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
      ? next
      : "/dashboard";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 px-5 text-zinc-100">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Brand />
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h1 className="text-xl font-semibold tracking-tight">Entra nel tuo spazio</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">
            Le tue landing, i contatti ricevuti e le statistiche sono legati al tuo account.
          </p>
          <div className="mt-6">
            <AuthForm next={target} />
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-zinc-600">
          La password viene salvata con hash scrypt, mai in chiaro.
          <br />
          <a href="/termini" className="hover:text-zinc-400">Termini</a> ·{" "}
          <a href="/privacy" className="hover:text-zinc-400">Privacy</a> ·{" "}
          <a href="/cookie" className="hover:text-zinc-400">Cookie</a>
        </p>
      </div>
    </div>
  );
}
