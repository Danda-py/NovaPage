import Link from "next/link";
import { SitePreview } from "@/components/SitePreview";
import { Brand } from "@/components/Brand";
import type { Site } from "@/lib/site";

const demo: Site = {
  meta: { title: "Studio Aurora", description: "Identità visiva e contenuti per brand indipendenti" },
  theme: {
    bg_color: "#08070f",
    text_color: "#f3f0ff",
    accent_color: "#8b5cf6",
    accent2: "#22d3ee",
    style: "aurora",
    font: "sans",
  },
  blocks: [
    {
      id: "m1",
      type: "hero",
      data: {
        title: "Studio Aurora",
        subtitle: "Identità visiva e contenuti per brand indipendenti",
        badge: "Nuovi progetti aperti",
        avatar: "/demo/studio.jpg",
      },
    },
    {
      id: "m2",
      type: "catalog",
      data: {
        title: "Servizi",
        layout: "list",
        items: [
          { id: "p1", name: "Identità visiva", price: "250€", status: "Disponibile", image: "/demo/identita.jpg" },
          { id: "p2", name: "Sito one-page", price: "390€", status: "Disponibile", image: "/demo/sito.jpg" },
          { id: "p3", name: "Contenuti mensili", price: "90€/mese", status: "Disponibile", image: "/demo/contenuti.jpg" },
        ],
      },
    },
    {
      id: "m3",
      type: "links",
      data: {
        buttons: [
          { label: "Scrivici su WhatsApp", url: "https://wa.me/393331234567", icon: "whatsapp", variant: "primary" },
          { label: "Portfolio su Instagram", url: "https://instagram.com", icon: "instagram", variant: "ghost" },
        ],
      },
    },
  ],
};

const features = [
  {
    title: "Modifichi parlando",
    text: "Scrivi o detti «sfondo nero con dettagli viola»: la pagina cambia in un secondo.",
  },
  {
    title: "Nata per il telefono",
    text: "Tutto si fa da smartphone, tra un cliente e l'altro. Nessun editor da imparare.",
  },
  {
    title: "Un link da condividere",
    text: "Ogni progetto ha il suo indirizzo pubblico, pronto per la bio di Instagram.",
  },
  {
    title: "Foto e dettatura",
    text: "Allega immagini dalla chat e detta il prompt: il logo finisce al posto giusto.",
  },
  {
    title: "Contatti e visite",
    text: "Moduli che salvano i lead e statistiche su visite e clic dei pulsanti.",
  },
  {
    title: "Sei stili, zero template uguali",
    text: "Aurora, neon, editorial, luxury, glass, minimal: la pagina cambia carattere.",
  },
];

const steps = [
  { n: "01", title: "Descrivi l'attività", text: "«Bar a Milano, orari 7-19, menù e WhatsApp». Basta questo." },
  { n: "02", title: "La chat costruisce", text: "Nova aggiunge sezioni, testi e colori. Tu correggi a parole." },
  { n: "03", title: "Condividi il link", text: "Pubblichi e mandi l'indirizzo dove vuoi." },
];

const audiences = [
  { title: "Attività locali", text: "Bar, parrucchieri, officine: contatti, orari e offerte sempre aggiornati." },
  { title: "Reseller e collezionisti", text: "Vetrine con prezzi e stato «Sold Out» modificabili al volo." },
  { title: "Creator e freelance", text: "Link-in-bio, servizi e raccolta contatti in un'unica pagina curata." },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Brand />
          <nav className="hidden items-center gap-6 text-sm text-zinc-400 sm:flex">
            <a href="#funzioni" className="hover:text-zinc-100">Funzioni</a>
            <a href="#come" className="hover:text-zinc-100">Come funziona</a>
            <a href="#per-chi" className="hover:text-zinc-100">Per chi</a>
          </nav>
          <Link
            href="/dashboard"
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            Apri l&apos;app
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(55% 45% at 15% 0%, rgba(139,92,246,0.25), transparent 70%), radial-gradient(45% 35% at 90% 10%, rgba(34,211,238,0.16), transparent 70%)",
            }}
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-16 lg:grid-cols-2 lg:items-center lg:gap-10 lg:pt-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-violet-300">
                Beta aperta
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
                La tua landing page,
                <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  scritta in chat.
                </span>
              </h1>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-zinc-400">
                Descrivi la tua attività e NovaPage costruisce la pagina. Cambi colori, testi e
                prodotti parlando, mentre l&apos;anteprima si aggiorna. Nessun editor, nessun menu.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500"
                >
                  Crea la tua landing gratis
                </Link>
                <Link
                  href="/s/casa-aurora"
                  className="rounded-xl border border-zinc-800 px-5 py-3 text-sm font-medium text-zinc-300 hover:border-zinc-600"
                >
                  Vedi un esempio
                </Link>
              </div>
              <p className="mt-4 text-xs text-zinc-600">
                Nessuna carta di credito · online in meno di un minuto
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-[340px]">
              <div className="overflow-hidden rounded-[2.25rem] border border-zinc-800 bg-zinc-950 shadow-2xl">
                <div className="h-[592px] overflow-hidden">
                  <SitePreview site={demo} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="funzioni" className="border-t border-zinc-900">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
              Tutto quello che serve, niente da configurare
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
              Sei blocchi, sei stili, un solo modo di lavorare: dire cosa vuoi.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-700"
                >
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="come" className="border-t border-zinc-900 bg-zinc-900/20">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Come funziona</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {steps.map((s) => (
                <div key={s.n}>
                  <span className="text-[11px] font-semibold tracking-[0.24em] text-violet-400">{s.n}</span>
                  <h3 className="mt-2 text-base font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="per-chi" className="border-t border-zinc-900">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Per chi è pensata</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {audiences.map((a) => (
                <div key={a.title} className="rounded-2xl border border-zinc-800 p-5">
                  <h3 className="text-sm font-semibold">{a.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{a.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-900">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center">
            <h2 className="text-3xl font-bold tracking-tight">La tua pagina è a una frase di distanza</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
              Apri l&apos;app, racconta cosa fai e guarda la pagina prendere forma. Se non ti piace,
              lo dici e cambia.
            </p>
            <Link
              href="/dashboard"
              className="mt-8 inline-block rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500"
            >
              Inizia ora
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-900">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-zinc-600 sm:flex-row">
            <Brand className="text-zinc-400" />
            <div className="flex flex-wrap justify-center gap-5">
              <a href="#funzioni" className="hover:text-zinc-400">Funzioni</a>
              <a href="#come" className="hover:text-zinc-400">Come funziona</a>
              <Link href="/dashboard" className="hover:text-zinc-400">Apri l&apos;app</Link>
              <Link href="/termini" className="hover:text-zinc-400">Termini</Link>
              <Link href="/privacy" className="hover:text-zinc-400">Privacy</Link>
              <Link href="/cookie" className="hover:text-zinc-400">Cookie</Link>
            </div>
          </div>

          <p className="mt-6 border-t border-zinc-900 pt-5 text-center text-[11px] leading-relaxed text-zinc-600">
            NovaPage è attualmente in versione Beta a scopo dimostrativo e di test. Il servizio viene
            fornito così com&apos;è, senza garanzie di uptime.
          </p>
        </div>
      </footer>
    </div>
  );
}
