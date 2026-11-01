export const instant = false;
export const metadata = { title: "Contatti", robots: { index: false, follow: false } };
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { listLeadsForOwner, listSites } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { Brand } from "@/components/Brand";
import { DeleteLead } from "@/components/DeleteLead";
import { LeadActions } from "@/components/LeadActions";
import { MarkAllRead } from "@/components/MarkAllRead";
import { LogoutButton } from "@/components/LogoutButton";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { filtro } = await searchParams;
  const onlyUnread = filtro === "nuovi";

  const [sites, allLeads] = await Promise.all([listSites(user.id), listLeadsForOwner(user.id)]);
  const titles = new Map(sites.map((site) => [site.id, site]));
  const unread = allLeads.filter((lead) => !lead.read).length;
  const pending = allLeads.filter((lead) => !lead.handled).length;
  const leads = onlyUnread ? allLeads.filter((lead) => !lead.read) : allLeads;

  const tab = (label: string, href: string, active: boolean, count?: number) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium ${
        active
          ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/30"
          : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {label}
      {count ? (
        <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-300">
          {count}
        </span>
      ) : null}
    </Link>
  );

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

      <main className="mx-auto max-w-3xl px-5 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Contatti ricevuti</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {allLeads.length} totali · {unread} da leggere · {pending} da gestire, da tutte le tue
              landing page.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {allLeads.length > 0 && (
              <a
                href="/api/leads/export"
                className="inline-flex min-h-9 items-center rounded-lg border border-zinc-700 px-3 text-[11px] font-medium text-zinc-300 hover:border-zinc-500"
              >
                Esporta CSV
              </a>
            )}
            <MarkAllRead unread={unread} />
          </div>
        </div>

        <nav aria-label="Filtra i contatti" className="mt-5 flex flex-wrap items-center gap-1">
          {tab("Tutti", "/leads", !onlyUnread, allLeads.length)}
          {tab("Da leggere", "/leads?filtro=nuovi", onlyUnread, unread)}
        </nav>

        {leads.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
            <p className="text-sm text-zinc-400">
              {onlyUnread ? "Nessun contatto da leggere." : "Non hai ancora ricevuto contatti."}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Aggiungi un blocco modulo alla landing: ogni invio arriva qui.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {leads.map((lead) => {
              const site = titles.get(lead.siteId);
              return (
                <li
                  key={lead.id}
                  className={`rounded-2xl border p-4 ${
                    lead.read
                      ? "border-zinc-800 bg-zinc-900/30"
                      : "border-violet-500/30 bg-violet-500/[0.06]"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13.5px] font-medium">
                      {lead.name || "Senza nome"}
                      {!lead.read && (
                        <span className="ml-2 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-violet-300">
                          nuovo
                        </span>
                      )}
                      {lead.handled && (
                        <span className="ml-2 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-emerald-300">
                          gestito
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-3">
                      <p className="text-[11px] text-zinc-500">{formatDate(lead.createdAt)}</p>
                      <DeleteLead siteId={lead.siteId} leadId={lead.id} name={lead.name} />
                    </div>
                  </div>

                  {site && (
                    <p className="mt-1 text-[11px] text-zinc-500">
                      da{" "}
                      <Link
                        href={`/sites/${site.id}`}
                        className="inline-flex min-h-9 items-center text-violet-400 hover:underline"
                      >
                        {site.config.meta.title}
                      </Link>
                    </p>
                  )}

                  <p className="mt-1 flex flex-wrap gap-3 text-[12px] text-zinc-300">
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="text-violet-300 hover:underline">
                        {lead.email}
                      </a>
                    )}
                    {lead.phone && (
                      // Un `tel:` con spazi o testo libero non compone: si tengono solo cifre e +.
                      <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">
                        {lead.phone}
                      </a>
                    )}
                  </p>

                  {lead.message && (
                    <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-zinc-300">
                      {lead.message}
                    </p>
                  )}

                  <LeadActions
                    siteId={lead.siteId}
                    leadId={lead.id}
                    email={lead.email}
                    handled={lead.handled}
                    repliedAt={lead.repliedAt}
                    notes={lead.notes}
                    siteTitle={site?.config.meta.title ?? "la tua attività"}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
