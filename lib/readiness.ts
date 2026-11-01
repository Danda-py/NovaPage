import type { Site } from "./site";
import { isHtmlPage, plainText } from "./html";

export type ReadinessItem = {
  key: string;
  ok: boolean;
  label: string;
  hint: string;
};

/** Segnaposto lasciati dai template o dall'IA: non devono finire pubblicati. */
const PLACEHOLDER =
  /nome attività|la mia pagina|una frase che spiega cosa fai|titolo qui|lorem ipsum|creata con novapage/i;

function baseItems(site: Site): ReadinessItem[] {
  return [
    {
      key: "title",
      ok: Boolean(site.meta.title.trim()) && !PLACEHOLDER.test(site.meta.title),
      label: "Titolo reale della pagina",
      hint: "Sostituisci i segnaposto con il nome dell'attività.",
    },
    {
      key: "description",
      ok: site.meta.description.trim().length >= 30 && !PLACEHOLDER.test(site.meta.description),
      label: "Descrizione per i link condivisi",
      hint: "Almeno 30 caratteri: è il testo che appare nell'anteprima su WhatsApp e Google.",
    },
  ];
}

/**
 * Controlli per le pagine in HTML libero: qui non ci sono blocchi da ispezionare,
 * quindi si guarda direttamente il markup e il testo che contiene.
 */
function htmlItems(site: Site): ReadinessItem[] {
  const html = site.html ?? "";
  const text = plainText(html, 6000);

  return [
    {
      key: "size",
      ok: text.length >= 200,
      label: "Contenuti reali nella pagina",
      hint: "La pagina ha pochissimo testo: chiedi a Nova di scrivere titoli, sezioni e descrizioni.",
    },
    {
      key: "contact",
      ok: /wa\.me|mailto:|tel:\+?\d|href="#contatti"|id="contatt/i.test(html),
      label: "Un modo per essere contattati",
      hint: "Aggiungi un link WhatsApp, email o telefono: senza contatto la landing non porta clienti.",
    },
    {
      key: "legal",
      ok: Boolean(site.legal?.businessName?.trim() && site.legal?.vat?.trim()),
      label: "Titolare e P.IVA indicati",
      hint: "Ragione sociale, P.IVA e sede sono obbligatori su un sito di impresa: chiedi a Nova di aggiungerli nel footer.",
    },
    {
      key: "privacy",
      ok: /privacy|informativa/i.test(text),
      label: "Informativa privacy linkata",
      hint: "Se la pagina raccoglie dati o usa tracciamenti serve un link all'informativa privacy.",
    },
    {
      key: "placeholder",
      ok: !/lorem ipsum|titolo qui|testo segnaposto/i.test(text),
      label: "Nessun testo segnaposto",
      hint: "Ci sono testi di esempio: sostituiscili con i contenuti reali dell'attività.",
    },
  ];
}

/**
 * Cosa manca prima di condividere la pagina. Sono avvisi, non blocchi: l'utente
 * resta libero di pubblicare una pagina incompleta.
 */
export function siteReadiness(site: Site): ReadinessItem[] {
  if (isHtmlPage(site)) return [...baseItems(site), ...htmlItems(site)];

  const buttons = site.blocks.flatMap((block) => block.data.buttons ?? []);
  const contact = site.blocks.find((block) => block.type === "contact");

  const hasContact =
    Boolean(
      contact?.data.phone ||
        contact?.data.email ||
        contact?.data.whatsapp ||
        contact?.data.address,
    ) ||
    site.blocks.some((block) => block.type === "form") ||
    buttons.some(
      (button) =>
        /^(https:\/\/wa\.me\/|tel:|mailto:)/i.test(button.url) || button.icon === "whatsapp",
    );

  const deadLinks = buttons.filter((button) => !button.url.trim()).length;
  const sells = site.blocks.some((block) =>
    (block.data.items ?? []).some((item) => item.price.trim()),
  );

  return [
    ...baseItems(site),
    {
      key: "contact",
      ok: hasContact,
      label: "Almeno un modo per essere contattati",
      hint: "Aggiungi telefono, email, WhatsApp o un modulo contatti.",
    },
    {
      key: "links",
      ok: deadLinks === 0,
      label: "Nessun pulsante senza link",
      hint:
        deadLinks === 1
          ? "1 pulsante non ha un URL: aprilo nell'editor e completalo."
          : `${deadLinks} pulsanti non hanno un URL: aprili nell'editor e completali.`,
    },
    {
      key: "legal",
      ok: !sells || Boolean(site.legal?.businessName?.trim() && site.legal?.vat?.trim()),
      label: "Dati del titolare con prezzi in vetrina",
      hint: "Con prodotti e prezzi servono ragione sociale e P.IVA nel footer (obbligatori per legge).",
    },
  ];
}
