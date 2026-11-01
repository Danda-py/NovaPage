import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-6 text-center text-zinc-100">
      <Brand />
      <p className="mt-6 text-[11px] uppercase tracking-[0.3em] text-zinc-500">Errore 404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Questa pagina non esiste</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
        Il link potrebbe essere stato rimosso, rinominato o non è mai esistito.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
      >
        Torna alle mie landing
      </Link>
    </div>
  );
}
