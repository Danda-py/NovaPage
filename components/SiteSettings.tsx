"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { safeFetch } from "@/lib/http";

type DnsRecord = { host: string; type: "A" | "CNAME"; name: string; value: string };

type DomainRecords = {
  txtName: string;
  txtValue: string;
  hosts: string[];
  dns: DnsRecord[];
};

type SlugStatus = "idle" | "checking" | "available" | "taken" | "unknown";

export function SiteSettings({
  siteId,
  title,
  slug,
  published,
  customDomain,
  customDomainAlias,
  domainVerified,
  domainToken,
  initialRecords,
}: {
  siteId: string;
  title: string;
  slug: string;
  published: boolean;
  customDomain?: string;
  customDomainAlias?: string;
  domainVerified: boolean;
  domainToken?: string;
  initialRecords: DomainRecords | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(title);
  const [value, setValue] = useState(slug);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  // Esito dell'ultimo controllo: lo stato mostrato si ricava dal valore corrente,
  // così l'effetto non deve scrivere stato in modo sincrono.
  const [slugCheck, setSlugCheck] = useState<{
    value: string;
    available: boolean | null;
  } | null>(null);
  const [isPublished, setIsPublished] = useState(published);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState("");

  const [domain, setDomain] = useState(customDomain ?? "");
  const [currentDomain, setCurrentDomain] = useState(customDomain ?? "");
  const [verified, setVerified] = useState(domainVerified);
  const [records, setRecords] = useState<DomainRecords | null>(initialRecords);
  const [domainBusy, setDomainBusy] = useState<"" | "saving" | "verifying" | "removing">("");
  const [domainError, setDomainError] = useState("");
  const [domainNote, setDomainNote] = useState("");
  const [hostingNote, setHostingNote] = useState("");
  const [copied, setCopied] = useState("");

  const nextSlug = value.trim();
  const slugStatus: SlugStatus =
    !nextSlug || nextSlug === slug
      ? "idle"
      : slugCheck?.value === nextSlug
        ? slugCheck.available === true
          ? "available"
          : slugCheck.available === false
            ? "taken"
            : "unknown"
        : "checking";

  const dirty = name.trim() !== title || nextSlug !== slug;
  const busySlug = slugStatus === "checking" || slugStatus === "taken";

  // Disponibilità dell'indirizzo: si controlla mentre si scrive, con un'attesa
  // breve, così l'utente sa subito se il link è libero invece di scoprirlo al salvataggio.
  useEffect(() => {
    const next = value.trim();
    if (!next || next === slug) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const res = await safeFetch(
        `/api/sites/check-slug?slug=${encodeURIComponent(next)}&siteId=${encodeURIComponent(siteId)}`,
      );
      if (cancelled) return;
      if (!res) {
        // La rete assente non deve bloccare il salvataggio per sempre: il server
        // ricontrolla comunque la disponibilità e risponde con un errore chiaro.
        setSlugCheck({ value: next, available: null });
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      setSlugCheck({
        value: next,
        available: typeof data.available === "boolean" ? data.available : null,
      });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, slug, siteId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || busySlug) return;
    setState("saving");
    setSaveError("");
    const res = await safeFetch(`/api/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: name.trim(), slug: value.trim() }),
    }).catch(() => null);
    // Senza il catch la rete assente lasciava il bottone su "…" per sempre.
    if (!res) {
      setState("error");
      setSaveError("Connessione assente: riprova.");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState("error");
      setSaveError(typeof data.error === "string" ? data.error : "Controlla i valori");
      return;
    }
    // Il server normalizza il link (minuscole, trattini): mostriamo quello reale.
    if (typeof data.site?.slug === "string") setValue(data.site.slug);
    if (typeof data.site?.config?.meta?.title === "string") setName(data.site.config.meta.title);
    setState("saved");
    router.refresh();
  }

  async function togglePublished() {
    if (toggling) return;
    setToggling(true);
    const target = !isPublished;
    const res = await safeFetch(`/api/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: target }),
    }).catch(() => null);
    if (res?.ok) {
      setToggleError("");
      setIsPublished(target);
      router.refresh();
    } else {
      setToggleError("Aggiornamento non riuscito: riprova.");
    }
    setToggling(false);
  }

  async function connectDomain() {
    const next = domain.trim();
    if (!next) return;
    setDomainBusy("saving");
    setDomainError("");
    setDomainNote("");
    setHostingNote("");
    const res = await safeFetch(`/api/sites/${siteId}/domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: next }),
    });
    if (!res) {
      setDomainError("Connessione assente: riprova.");
      setDomainBusy("");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setDomainError(typeof data.error === "string" ? data.error : "Dominio non valido");
      setDomainBusy("");
      return;
    }
    const saved = typeof data.site?.customDomain === "string" ? data.site.customDomain : next;
    setCurrentDomain(saved);
    setDomain(saved);
    // Lo stato viene dal server: risalvare lo stesso dominio non fa perdere la verifica.
    setVerified(data.site?.domainVerified === true);
    setRecords(isRecords(data.records) ? data.records : null);
    setDomainNote("Dominio salvato: aggiungi i record DNS e poi verifica.");
    setDomainBusy("");
    router.refresh();
  }

  async function verifyDomain() {
    if (!currentDomain || domainBusy) return;
    setDomainBusy("verifying");
    setDomainError("");
    setDomainNote("");
    const res = await safeFetch(`/api/sites/${siteId}/domain/verify`, { method: "POST" });
    if (!res) {
      setDomainError("Connessione assente: riprova.");
      setDomainBusy("");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setDomainError(typeof data.error === "string" ? data.error : "Verifica non riuscita");
      setDomainBusy("");
      return;
    }
    setVerified(data.verified === true);
    if (isRecords(data.records)) setRecords(data.records);
    setHostingNote(typeof data.hostingNote === "string" ? data.hostingNote : "");
    setDomainNote(
      data.verified === true
        ? data.hosted === true
          ? "Dominio verificato e collegato all'hosting: la pagina risponde su entrambi i nomi."
          : "Dominio verificato. Manca l'ultimo passaggio lato hosting: riprova tra poco."
        : data.ownershipVerified === true
          ? "Proprietà verificata, ma il dominio non è ancora attivo: riprova tra poco."
          : "Record TXT non ancora visibile: la propagazione DNS può richiedere qualche minuto.",
    );
    if (data.verified === true) router.refresh();
    setDomainBusy("");
  }

  async function removeDomain() {
    if (!currentDomain || domainBusy) return;
    setDomainBusy("removing");
    setDomainError("");
    setDomainNote("");
    const res = await safeFetch(`/api/sites/${siteId}/domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: null }),
    });
    if (!res?.ok) {
      setDomainError("Rimozione non riuscita: riprova.");
      setDomainBusy("");
      return;
    }
    setCurrentDomain("");
    setDomain("");
    setVerified(false);
    setRecords(null);
    setHostingNote("");
    setDomainNote("Dominio rimosso.");
    setDomainBusy("");
    router.refresh();
  }

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  }

  const txtName =
    records?.txtName ?? (currentDomain ? `_novapage.${currentDomain.replace(/^www\./, "")}` : "");
  const txtValue = records?.txtValue ?? (domainToken ? `novapage-verify=${domainToken}` : "");
  const servedHosts =
    records?.hosts ??
    [currentDomain, customDomainAlias].filter((value): value is string => Boolean(value));

  const input =
    "w-full rounded-lg bg-zinc-950 px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-violet-500";
  const smallButton =
    "inline-flex min-h-9 items-center rounded-lg border border-zinc-700 px-3 text-[11px] font-medium text-zinc-300 hover:border-zinc-500 disabled:opacity-40";

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="site-name" className="block text-[11px] uppercase tracking-wider text-zinc-500">
          Nome
        </label>
        <input
          id="site-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={input}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="site-slug" className="block text-[11px] uppercase tracking-wider text-zinc-500">
          Indirizzo gratuito
        </label>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-zinc-500">/s/</span>
          <input
            id="site-slug"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={input}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="nome-pagina"
            aria-describedby="slug-help slug-status"
          />
        </div>
        <p id="slug-help" className="text-[11px] text-zinc-500">
          Lettere minuscole, numeri e trattini. Cambiandolo, il link vecchio smette di funzionare.
        </p>
        <p id="slug-status" aria-live="polite" className="min-h-4 text-[11px]">
          {slugStatus === "checking" && <span className="text-zinc-500">Controllo disponibilità…</span>}
          {slugStatus === "available" && <span className="text-emerald-400">Indirizzo disponibile</span>}
          {slugStatus === "taken" && <span className="text-amber-300">Questo indirizzo è già in uso</span>}
          {slugStatus === "unknown" && (
            <span className="text-zinc-400">
              Non ho potuto verificarlo ora: salva per confermare.
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!dirty || state === "saving" || busySlug}
          className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium hover:bg-zinc-700 disabled:opacity-40"
        >
          {state === "saving" ? "…" : "Salva"}
        </button>
        {state === "saved" && <span className="text-[11px] text-emerald-400">Salvato</span>}
        {state === "error" && <span className="text-[11px] text-red-400">{saveError}</span>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-200">
            {isPublished ? "Pagina pubblicata" : "Pagina in bozza"}
          </p>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            {isPublished
              ? "Visibile a chi ha il link ed elencata nella sitemap."
              : "Il link pubblico mostra la pagina 404 e non entra in sitemap."}
          </p>
        </div>
        <button
          type="button"
          onClick={togglePublished}
          disabled={toggling}
          className={`rounded-lg px-3 py-1.5 text-[11px] font-medium disabled:opacity-50 ${
            isPublished
              ? "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
              : "bg-violet-600 text-white hover:bg-violet-500"
          }`}
        >
          {toggling ? "…" : isPublished ? "Metti in bozza" : "Pubblica"}
        </button>
      </div>
      {toggleError && <p className="text-[11.5px] text-red-400">{toggleError}</p>}

      <section className="space-y-3 rounded-lg border border-zinc-800 p-3" aria-labelledby="domain-title">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 id="domain-title" className="text-xs font-medium text-zinc-200">
              Dominio personalizzato
            </h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
              Collega un dominio che possiedi (es. <span className="text-zinc-400">www.miopanetteria.it</span>)
              al posto di /s/{slug || "nome-pagina"}.
            </p>
          </div>
          {currentDomain && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                verified ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {verified ? "Verificato" : "In attesa"}
            </span>
          )}
        </div>

        {!currentDomain ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Dominio personalizzato</span>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className={input}
                placeholder="www.miosito.it"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <button
              type="button"
              onClick={connectDomain}
              disabled={!domain.trim() || domainBusy !== ""}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 px-3 text-xs font-medium hover:bg-zinc-700 disabled:opacity-40"
            >
              {domainBusy === "saving" ? "…" : "Collega dominio"}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="truncate font-mono text-[12px] text-zinc-200">{currentDomain}</p>

            <div className="space-y-1.5 rounded-lg bg-zinc-950/70 p-2.5">
              <p className="text-[10.5px] leading-relaxed text-zinc-500">
                Aggiungi questi record nel pannello DNS del tuo dominio. La pagina risponde sul nuovo
                indirizzo solo dopo la verifica.
              </p>
              {txtName && txtValue && (
                <DomainRecord
                  type="TXT"
                  name={txtName}
                  value={txtValue}
                  copied={copied === "txt"}
                  onCopy={() => copy("txt", txtValue)}
                />
              )}
              {(records?.dns ?? []).map((record) => (
                <DomainRecord
                  key={`${record.type}-${record.name}`}
                  type={record.type}
                  name={record.name}
                  value={record.value}
                  copied={copied === record.type}
                  onCopy={() => copy(record.type, record.value)}
                />
              ))}
            </div>

            {servedHosts.length > 0 && (
              <p className="text-[10.5px] leading-relaxed text-zinc-500">
                Nomi serviti dalla stessa pagina:{" "}
                <span className="font-mono text-zinc-300">{servedHosts.join(" · ")}</span>
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={verifyDomain} disabled={domainBusy !== ""} className={smallButton}>
                {domainBusy === "verifying" ? "…" : "Verifica ora"}
              </button>
              <button
                type="button"
                onClick={removeDomain}
                disabled={domainBusy !== ""}
                className="inline-flex min-h-9 items-center rounded-lg border border-zinc-800 px-3 text-[11px] font-medium text-zinc-400 hover:border-red-900 hover:text-red-300 disabled:opacity-40"
              >
                {domainBusy === "removing" ? "…" : "Rimuovi dominio"}
              </button>
            </div>
          </div>
        )}

        {domainError && (
          <p role="alert" className="text-[11.5px] text-red-400">
            {domainError}
          </p>
        )}
        {domainNote && (
          <p aria-live="polite" className="text-[11.5px] text-zinc-400">
            {domainNote}
          </p>
        )}
        {hostingNote && (
          <p className="text-[11px] leading-relaxed text-amber-200/80">{hostingNote}</p>
        )}
      </section>
    </form>
  );
}

function isRecords(value: unknown): value is DomainRecords {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.txtName === "string" &&
    typeof r.txtValue === "string" &&
    Array.isArray(r.hosts) &&
    Array.isArray(r.dns)
  );
}

function DomainRecord({
  type,
  name,
  value,
  copied,
  onCopy,
}: {
  type: string;
  name: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1 border-t border-zinc-800 pt-1.5 first:border-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{type}</span>
        <button
          type="button"
          onClick={onCopy}
          className="min-h-7 rounded border border-zinc-800 px-2 text-[10px] text-zinc-400 hover:border-zinc-600"
          aria-label={`Copia valore ${type}`}
        >
          {copied ? "Copiato" : "Copia"}
        </button>
      </div>
      <p className="break-all font-mono text-[10.5px] leading-relaxed text-zinc-400">
        <span className="text-zinc-600">nome</span> {name}
        <br />
        <span className="text-zinc-600">valore</span> {value}
      </p>
    </div>
  );
}
