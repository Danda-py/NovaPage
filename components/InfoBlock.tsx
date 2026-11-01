"use client";

import { useState } from "react";
import type { InfoRow } from "@/lib/site";

type Props = {
  title?: string;
  rows: InfoRow[];
  accent: string;
  textColor: string;
  soft: string;
  line: string;
  radius: string;
  faint: string;
};

export function InfoBlock({ title, rows, accent, textColor, soft, line, radius, faint }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      window.prompt("Copia", value);
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
              <p className="truncate text-[13.5px] font-semibold" style={{ color: textColor }}>
                {row.value}
              </p>
            </div>
            <button
              type="button"
              onClick={() => copy(row.value)}
              className="shrink-0 rounded-lg border px-2.5 py-1 text-[10.5px] font-medium"
              style={{ borderColor: line, color: copied === row.value ? accent : soft }}
            >
              {copied === row.value ? "Copiato ✓" : "Copia"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
