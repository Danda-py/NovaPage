"use client";

import { useState } from "react";
import type { InfoRow } from "@/lib/site";

type Props = {
  title?: string;
  rows: InfoRow[];
  textColor: string;
  soft: string;
  line: string;
  radius: string;
  faint: string;
};

/**
 * Elenco etichetta/valore (orari, Wi-Fi, indirizzi). Il pulsante "Copia" compare
 * solo sulle righe che lo chiedono (`copy: true`): l'assistente e l'editor possono
 * aggiungerlo o toglierlo, quindi vale sia "metti un tasto copia sulla password"
 * sia "togli il tasto copia".
 */
export function InfoBlock({ title, rows, textColor, soft, line, radius, faint }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(row: InfoRow) {
    try {
      await navigator.clipboard.writeText(row.value);
      setCopied(row.value);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // Permesso negato o contesto non sicuro: il testo resta selezionabile.
      window.prompt(`Copia ${row.label}`, row.value);
    }
  }

  return (
    <section className="border p-4" style={{ backgroundColor: faint, borderColor: line, borderRadius: radius }}>
      {title && <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: soft }}>{title}</h2>}
      <ul className="mt-2.5 divide-y" style={{ borderColor: line }}>
        {rows.map((row, i) => (
          <li
            key={`${row.label}-${i}`}
            className="flex items-center justify-between gap-3 py-2.5"
            style={{ borderTop: i ? `1px solid ${line}` : undefined }}
          >
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide" style={{ color: soft }}>
                {row.label}
              </p>
              <p className="break-words text-[13.5px] font-semibold" style={{ color: textColor }}>
                {row.value}
              </p>
            </div>
            {row.copy && (
              <button
                type="button"
                onClick={() => copy(row)}
                aria-label={`Copia ${row.label}`}
                className="inline-flex min-h-9 shrink-0 items-center rounded-lg border px-3 text-[11px] font-medium transition-opacity hover:opacity-80"
                style={{ borderColor: line, color: copied === row.value ? textColor : soft }}
              >
                {copied === row.value ? "Copiato ✓" : "Copia"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
