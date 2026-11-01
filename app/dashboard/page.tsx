export const instant = false;
export const metadata = { title: "I miei siti", robots: { index: false, follow: false } };
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { listLeadsForOwner, listSites } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { SiteCard } from "@/components/SiteCard";
import { NewSite } from "@/components/NewSite";
import { LogoutButton } from "@/components/LogoutButton";
import { Brand } from "@/components/Brand";
import { siteReadiness } from "@/lib/readiness";

export default async function Dashboard() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sites = await listSites(user.id);
  const leads = await listLeadsForOwner(user.id);

  const leadsBySite = new Map<string, number>();
  const unreadBySite = new Map<string, number>();
  let unreadTotal = 0;
  for (const lead of leads) {
    leadsBySite.set(lead.siteId, (leadsBySite.get(lead.siteId) ?? 0) + 1);
    if (!lead.read) {
      unreadBySite.set(lead.siteId, (unreadBySite.get(lead.siteId) ?? 0) + 1);
      unreadTotal += 1;
    }
  }

  // Solo i primi tre: la dashboard deve orientare, non diventare una lista di compiti.
  const needsWork = sites
    .map((site) => ({ site, missing: siteReadiness(site.config).filter((item) => !item.ok) }))
    .filter((entry) => entry.missing.length > 0)
    .slice(0, 3);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-5 backdrop-blur">
        <Brand />
        <div className="flex items-center gap-3">
          <span className="hidden max-w-[180px] truncate text-xs text-zinc-500 lg:block">{user.email}</span>
          <Link
            href="/leads"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs text-zinc-400 hover:text-zinc-100"
          >
            Contatti
            {unreadTotal > 0 && (
              <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                {unreadTotal}
              </span>
            )}
          </Link>
          <Link
            href="/account"
            className="inline-flex min-h-9 items-center rounded-lg px-2 text-xs text-zinc-400 hover:text-zinc-100"
          >
            Account
          </Link>
          <LogoutButton />
          <NewSite />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">I miei siti</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <span>
            {sites.length} landing page · {leads.length} contatti ricevuti
          </span>
          {unreadTotal > 0 && (
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[11px] font-medium text-violet-300">
              {unreadTotal} nuovi da leggere
            </span>
          )}
        </p>

        {needsWork.length > 0 && (
          <section className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-4">
            <h2 className="text-sm font-semibold text-amber-200">Completa le tue pagine</h2>
            <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-400">
              Pochi dettagli e la pagina è pronta da condividere: senza questi perde contatti o non è
              in regola.
            </p>
            <ul className="mt-3 space-y-2">
              {needsWork.map(({ site, missing }) => (
                <li
                  key={site.id}
                  className="flex flex-col gap-1.5 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-zinc-200">
                      {site.config.meta.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                      {missing.slice(0, 2).map((item) => item.label).join(" · ")}
                      {missing.length > 2 ? ` · +${missing.length - 2}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/sites/${site.id}`}
                    className="inline-flex min-h-9 shrink-0 items-center self-start rounded-lg border border-amber-500/40 px-2.5 text-[11px] font-medium text-amber-200 hover:bg-amber-500/10"
                  >
                    Sistema →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {sites.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
            <p className="text-sm text-zinc-400">Non hai ancora creato nessuna landing page.</p>
            <p className="mt-1 text-xs text-zinc-600">Crea la prima e descrivi la tua attività nella chat.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                leads={leadsBySite.get(site.id) ?? 0}
                unread={unreadBySite.get(site.id) ?? 0}
              />
            ))}
          </div>
        )}

        <section className="mt-12 flex flex-col gap-3 border-t border-zinc-900 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11.5px] leading-relaxed text-zinc-600">
            I dati restano tuoi: email, password, export e cancellazione dell&apos;account sono nelle
            impostazioni.
          </p>
          <Link
            href="/account"
            className="inline-flex min-h-9 shrink-0 items-center self-start rounded-lg border border-zinc-800 px-3 text-[12px] text-zinc-300 hover:border-zinc-600"
          >
            Impostazioni account
          </Link>
        </section>
      </main>
    </div>
  );
}
