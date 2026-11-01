import type { Metadata } from "next";
import Link from "next/link";
import { SitePreview } from "@/components/SitePreview";
import { Brand } from "@/components/Brand";
import type { Site } from "@/lib/site";
import { homeJsonLd, jsonLdScript } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "NovaPage — landing page della tua attività, creata in chat",
  description:
    "Descrivi l'attività e NovaPage costruisce la landing con testi, colori, orari e contatti. Link pubblico pronto per la bio. Beta gratuita.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "NovaPage — la landing page della tua attività, scritta in chat",
    description:
      "Descrivi l'attività e NovaPage costruisce la landing: testi, colori, orari, contatti, modulo e statistiche. Beta gratuita.",
    url: "/",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

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
        avatar: "/demo/studio.webp",
      },
    },
    {
      id: "m2",
      type: "catalog",
      data: {
        title: "Servizi",
        layout: "list",
        items: [
          { id: "p1", name: "Identità visiva", price: "250€", status: "Disponibile", image: "/demo/identita.webp" },
          { id: "p2", name: "Sito one-page", price: "390€", status: "Disponibile", image: "/demo/sito.webp" },
          { id: "p3", name: "Contenuti mensili", price: "90€/mese", status: "Disponibile", image: "/demo/contenuti.webp" },
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
    title: "Quindici stili, zero template uguali",
    text: "Aurora, neon, editoriale, luxury, glass, minimal, brutal, carta, mono, tramonto, bosco, cromato, pastello, riso, blueprint: e se non bastano, costruisci il tuo.",
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

const FAQ = [
  {
    question: "Quanto costa NovaPage?",
    answer:
      "La beta è gratuita: crei la pagina, la pubblichi su un link e raccogli contatti senza carta di credito.",
  },
  {
    question: "Serve saper usare un editor?",
    answer:
      "No. Descrivi l'attività in chat o con la dettatura e l'assistente prepara le sezioni; il pannello «Modifica a mano» resta disponibile per ritocchi precisi a testi, colori e foto.",
  },
  {
    question: "La pagina è ottimizzata per Google?",
    answer:
      "Sì. Ogni landing ha titolo e descrizione modificabili, URL canonico, immagine di anteprima per i social, dati strutturati schema.org con contatti, orari e prodotti, e una voce in sitemap quando è pubblicata.",
  },
  {
    question: "Posso usare le mie foto e il mio logo?",
    answer:
      "Sì: carichi immagini dalla chat o dall'editor e finiscono in galleria, scheda prodotto o foto profilo, ottimizzate per la visualizzazione mobile.",
  },
  {
    question: "Come arrivano i contatti dei clienti?",
    answer:
      "Il modulo salva nome, email, telefono e messaggio con la data del consenso. Ogni nuovo contatto ti arriva anche via email, puoi esportarli in CSV ed eliminarli singolarmente.",
  },
  {
    question: "Posso nascondere la pagina mentre la preparo?",
    answer:
      "Sì: mettila in bozza dalla pagina statistiche. Il link pubblico risponde 404, la pagina non entra in sitemap e non viene indicizzata.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(homeJsonLd({ baseUrl: siteUrl(), faq: FAQ })),
        }}
      />
      {/* Sfondo pieno: semi-trasparente le righe della pagina si vedevano passare
          sotto la testata mentre si scorreva. */}
      <header className="sticky top-0 z-20 border-b border-zinc-900 bg-zinc-950">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Brand />
          <nav aria-label="Sezioni della pagina" className="hidden items-center gap-5 text-sm text-zinc-400 sm:flex">
            <a href="#funzioni" className="inline-flex min-h-10 items-center hover:text-zinc-100">Funzioni</a>
            <a href="#come" className="inline-flex min-h-10 items-center hover:text-zinc-100">Come funziona</a>
            <a href="#per-chi" className="inline-flex min-h-10 items-center hover:text-zinc-100">Per chi</a>
            <a href="#domande" className="inline-flex min-h-10 items-center hover:text-zinc-100">Domande</a>
          </nav>
          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center rounded-xl bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-500"
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
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-10 sm:gap-14 sm:pb-20 sm:pt-16 lg:grid-cols-2 lg:items-center lg:gap-10 lg:pt-24">
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
              <p className="mt-4 text-xs text-zinc-400">
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

        <section id="funzioni" className="scroll-mt-16 border-t border-zinc-900">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
            <h2 className="max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
              Tutto quello che serve, niente da configurare
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
              Nove blocchi, quindici stili, un solo modo di lavorare: dire cosa vuoi.
            </p>
            <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
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

        <section id="come" className="scroll-mt-16 border-t border-zinc-900 bg-zinc-900/20">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Come funziona</h2>
            <div className="mt-8 grid gap-6 sm:mt-10 sm:grid-cols-3">
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

        <section id="per-chi" className="scroll-mt-16 border-t border-zinc-900">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Per chi è pensata</h2>
            <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-3">
              {audiences.map((a) => (
                <div key={a.title} className="rounded-2xl border border-zinc-800 p-5">
                  <h3 className="text-sm font-semibold">{a.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{a.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="domande" className="scroll-mt-16 border-t border-zinc-900 bg-zinc-900/20">
          <div className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Domande frequenti</h2>
            <div className="mt-8 divide-y divide-zinc-800 border-y border-zinc-800">
              {FAQ.map((item) => (
                <div key={item.question} className="py-5">
                  <h3 className="text-sm font-semibold text-zinc-100">{item.question}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-900">
          <div className="mx-auto max-w-3xl px-5 py-14 text-center sm:py-20">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">La tua pagina è a una frase di distanza</h2>
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
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-zinc-400 sm:flex-row">
            <Brand className="text-zinc-400" />
            <nav aria-label="Collegamenti del sito" className="flex flex-wrap justify-center gap-x-5">
              {[
                { href: "#funzioni", label: "Funzioni" },
                { href: "#come", label: "Come funziona" },
                { href: "#domande", label: "Domande" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-10 items-center underline-offset-4 hover:text-zinc-400 hover:underline"
                >
                  {item.label}
                </a>
              ))}
              <Link href="/dashboard" className="inline-flex min-h-10 items-center underline-offset-4 hover:text-zinc-400 hover:underline">
                Apri l&apos;app
              </Link>
              <Link href="/termini" className="inline-flex min-h-10 items-center underline-offset-4 hover:text-zinc-400 hover:underline">
                Termini
              </Link>
              <Link href="/privacy" className="inline-flex min-h-10 items-center underline-offset-4 hover:text-zinc-400 hover:underline">
                Privacy
              </Link>
              <Link href="/cookie" className="inline-flex min-h-10 items-center underline-offset-4 hover:text-zinc-400 hover:underline">
                Cookie
              </Link>
            </nav>
          </div>

          <p className="mt-6 border-t border-zinc-900 pt-5 text-center text-[11px] leading-relaxed text-zinc-400">
            NovaPage è attualmente in versione Beta a scopo dimostrativo e di test. Il servizio viene
            fornito così com&apos;è, senza garanzie di uptime.
          </p>
        </div>
      </footer>
    </div>
  );
}
