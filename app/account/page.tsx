export const instant = false;
export const metadata = { title: "Account", robots: { index: false, follow: false } };
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { aiUsageThisMonth, listLeadsForOwner, listSites } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/secure";
import { Brand } from "@/components/Brand";
import { AiKeySettings } from "@/components/AiKeySettings";
import { ChangeEmail } from "@/components/ChangeEmail";
import { ChangePassword } from "@/components/ChangePassword";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";
import { DeleteAccount } from "@/components/DeleteAccount";
import { LogoutButton } from "@/components/LogoutButton";

const card = "rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4";

export default async function AccountPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [sites, leads, aiUsage] = await Promise.all([
    listSites(user.id),
    listLeadsForOwner(user.id),
    aiUsageThisMonth(user.id),
  ]);
  const memberSince = new Date(user.createdAt).toLocaleDateString("it-IT", { dateStyle: "long" });
  // Solo le ultime 4 cifre: la chiave in chiaro non deve mai arrivare al browser.
  const aiKeyTail = decryptSecret(user.geminiKeyCipher)?.slice(-4) ?? null;

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <Brand showName={false} />
          <Link
            href="/dashboard"
            className="inline-flex min-h-9 items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
          >
            <span aria-hidden>←</span> I miei siti
          </Link>
        </div>
        <LogoutButton />
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-5 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Il tuo account</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Email, password e dati personali: tutto modificabile da qui.
          </p>
        </div>

        <section className={card}>
          <h2 className="text-sm font-semibold">Profilo</h2>
          <dl className="mt-3 space-y-2 text-[12.5px]">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-zinc-500">Email</dt>
              <dd className="min-w-0 truncate text-zinc-200">{user.email}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-zinc-500">Iscritto dal</dt>
              <dd className="text-zinc-200">{memberSince}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-zinc-500">Contenuti</dt>
              <dd className="text-zinc-200">
                {sites.length} landing page · {leads.length} contatti
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-zinc-500">Assistente AI (mese)</dt>
              <dd className="text-zinc-200">
                {aiUsage.requests === 0
                  ? "Nessuna richiesta"
                  : `${aiUsage.requests} richieste · ${(
                      aiUsage.prompt + aiUsage.output
                    ).toLocaleString("it-IT")} token`}
              </dd>
            </div>
          </dl>
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <ChangeEmail email={user.email} />
          </div>
        </section>

        <section className={card}>
          <h2 className="text-sm font-semibold">Chiave Gemini personale</h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">
            La chat genera le pagine con la chiave della piattaforma. Se ne hai una tua, mettila qui:
            le tue richieste passano dalla tua chiave.
          </p>
          <div className="mt-3">
            <AiKeySettings tail={aiKeyTail} />
          </div>
        </section>

        <section className={card}>
          <h2 className="text-sm font-semibold">Sicurezza</h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">
            Cambiando la password disconnetti le sessioni aperte sugli altri dispositivi.
          </p>
          <div className="mt-3">
            <ChangePassword />
          </div>
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <h3 className="text-[13px] font-semibold text-zinc-200">Verifica in due passaggi</h3>
            <div className="mt-2">
              <TwoFactorSettings enabled={user.twoFactorEnabled} />
            </div>
          </div>
        </section>

        <section className={card}>
          <h2 className="text-sm font-semibold">I tuoi dati</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-400">
            Scarica una copia di tutto ciò che hai su NovaPage: account, landing page, contatti
            ricevuti e conversazioni con la chat. Formato JSON, pronto per essere conservato o
            trasferito altrove.
          </p>
          <a
            href="/api/account/export"
            className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-zinc-700 px-3 text-[12px] font-medium text-zinc-200 hover:border-zinc-500"
          >
            Scarica i miei dati
          </a>
        </section>

        <section className="rounded-2xl border border-red-900/40 bg-red-950/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-red-300">Elimina account</h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">
                Cancella account, landing page, contatti e conversazioni. Operazione definitiva.
              </p>
            </div>
            <DeleteAccount />
          </div>
        </section>

        <p className="pt-2 text-[11.5px] leading-relaxed text-zinc-600">
          Per qualsiasi dubbio sul trattamento dei dati:{" "}
          <a href="mailto:privacy@novapage.site" className="text-violet-400 hover:underline">
            privacy@novapage.site
          </a>
          . Leggi l&apos;
          <Link href="/privacy" className="text-violet-400 hover:underline">
            informativa privacy
          </Link>{" "}
          e i{" "}
          <Link href="/termini" className="text-violet-400 hover:underline">
            termini di servizio
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
