import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ResetForm } from "@/components/ResetForm";

// Il token arriva dai parametri URL: senza questo la rotta viene prerenderizzata
// e Next segnala l'accesso ai dati URL fuori da <Suspense>.
export const instant = false;

export const metadata = { robots: { index: false, follow: false } };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
          <Brand />
          <Link href="/login" className="inline-flex min-h-9 items-center text-xs text-zinc-400 hover:text-zinc-200">
            ← Accedi
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-5 py-12">
        <h1 className="text-2xl font-bold tracking-tight">Nuova password</h1>

        {value ? (
          <ResetForm token={value} />
        ) : (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-sm font-medium text-zinc-200">Link non valido</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-400">
              Manca il codice di reset. Richiedi un nuovo link dalla pagina di recupero.
            </p>
            <Link href="/forgot" className="mt-4 inline-block text-xs text-violet-400 hover:underline">
              Richiedi un nuovo link
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
