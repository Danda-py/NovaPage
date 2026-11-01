export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { listLeads, listSites } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { SiteCard } from "@/components/SiteCard";
import { NewSite } from "@/components/NewSite";
import { LogoutButton } from "@/components/LogoutButton";
import { Brand } from "@/components/Brand";
import { DeleteAccount } from "@/components/DeleteAccount";

export default async function Dashboard() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sites = await listSites(user.id);
  const owned = new Set(sites.map((s) => s.id));
  const leads = (await listLeads()).filter((lead) => owned.has(lead.siteId));

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

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-5 backdrop-blur">
        <Brand />
        <div className="flex items-center gap-4">
          <span className="hidden max-w-[180px] truncate text-xs text-zinc-500 sm:block">{user.email}</span>
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

        <section className="mt-12 flex flex-col gap-3 border-t border-zinc-900 pt-6 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-[11.5px] leading-relaxed text-zinc-600">
            I dati restano tuoi: puoi cancellare l&apos;account e tutto ciò che contiene in qualsiasi
            momento.
          </p>
          <DeleteAccount />
        </section>
      </main>
    </div>
  );
}
