export const instant = false;
export const metadata = { robots: { index: false } };
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { countUnread, dailyStats, getSite, listLeads } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { SiteSettings } from "@/components/SiteSettings";
import { MarkRead } from "@/components/MarkRead";
import { Brand } from "@/components/Brand";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
}

function formatDay(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

export default async function SiteStatsPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const site = await getSite(id);
  if (!site || site.ownerId !== user.id) notFound();

  const [leads, unread, daily] = await Promise.all([
    listLeads(site.id),
    countUnread(site.id),
    dailyStats(site.id, 30),
  ]);
  const clicks = Object.entries(site.stats.clicks).sort((a, b) => b[1] - a[1]);
  const totalClicks = clicks.reduce((sum, [, n]) => sum + n, 0);
  const uniques = site.stats.uniques;

  const periodViews = daily.reduce((sum, d) => sum + d.views, 0);
  const periodClicks = daily.reduce((sum, d) => sum + d.clicks, 0);
  const peak = daily.reduce((max, d) => Math.max(max, d.views, d.clicks), 0);

  const stat = (label: string, value: number) => (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
    </div>
  );

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="flex h-14 items-center gap-3 border-b border-zinc-800 px-5">
        <Brand showName={false} />
        <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-zinc-200">
          ← I miei siti
        </Link>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{site.config.meta.title}</span>
        <Link
          href={`/editor/${site.id}`}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
        >
          Modifica
        </Link>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-5 py-8">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
          <SiteSettings siteId={site.id} title={site.config.meta.title} slug={site.slug} />
          <Link
            href={`/s/${site.slug}`}
            target="_blank"
            className="mt-2 inline-block text-xs text-violet-400 hover:underline"
          >
            Apri /s/{site.slug} ↗
          </Link>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stat("Visite", site.stats.views)}
          {stat("Visitatori unici", uniques)}
          {stat("Clic", totalClicks)}
          {stat("Contatti", leads.length)}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Ultimi 30 giorni</h2>
            <p className="text-[11px] text-zinc-500">
              <span className="text-zinc-300">{periodViews} visite</span> ·{" "}
              <span className="text-zinc-300">{periodClicks} clic</span>
            </p>
          </div>

          {peak === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">Nessun dato nel periodo.</p>
          ) : (
            <>
              <div className="mt-4 flex h-28 items-end gap-[3px]">
                {daily.map((d) => (
                  <div
                    key={d.day}
                    className="flex-1 rounded-t bg-violet-500/70 transition-colors hover:bg-violet-400"
                    style={{ height: `${Math.max(2, Math.round((d.views / peak) * 100))}%` }}
                    title={`${formatDay(d.day)} · ${d.views} visite · ${d.clicks} clic`}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-600">
                <span>{formatDay(daily[0].day)}</span>
                <span>visite per giorno</span>
                <span>{formatDay(daily[daily.length - 1].day)}</span>
              </div>
            </>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold">Clic per pulsante</h2>
          {clicks.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">Nessun clic registrato finora.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-800 rounded-2xl border border-zinc-800">
              {clicks.map(([label, count]) => (
                <li key={label} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                  <span className="truncate text-zinc-300">{label}</span>
                  <span className="shrink-0 font-semibold text-violet-400">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">
              Contatti ricevuti
              {unread > 0 && (
                <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                  {unread} nuovi
                </span>
              )}
            </h2>
            <MarkRead siteId={site.id} unread={unread} />
          </div>
          {leads.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">
              Nessun contatto. Aggiungi un blocco modulo alla pagina per raccoglierli.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {leads.map((lead) => (
                <li key={lead.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13.5px] font-medium">
                      {lead.name || "Senza nome"}
                      {!lead.read && (
                        <span className="ml-2 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-violet-300">
                          nuovo
                        </span>
                      )}
                      {lead.consentAt && (
                        <span
                          className="ml-2 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-emerald-300"
                          title={`Consenso al trattamento dei dati: ${formatDate(lead.consentAt)}`}
                        >
                          consenso ✓
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-zinc-500">{formatDate(lead.createdAt)}</p>
                  </div>
                  <p className="mt-1 space-x-3 text-[12px] text-zinc-400">
                    {lead.email && <span>{lead.email}</span>}
                    {lead.phone && <span>{lead.phone}</span>}
                  </p>
                  {lead.message && (
                    <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-zinc-300">
                      {lead.message}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
