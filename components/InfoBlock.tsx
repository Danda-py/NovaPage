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
 * Elenco etichetta/valore (orari, Wi-Fi, indirizzi). Senza pulsante "Copia": il
 * testo resta selezionabile, e i valori lunghi vanno a capo invece di essere
 * troncati, così una password si legge per intero.
 */
export function InfoBlock({ title, rows, textColor, soft, line, radius, faint }: Props) {
  return (
    <section className="border p-4" style={{ backgroundColor: faint, borderColor: line, borderRadius: radius }}>
      {title && <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: soft }}>{title}</h2>}
      <ul className="mt-2.5 divide-y" style={{ borderColor: line }}>
        {rows.map((row, i) => (
          <li
            key={`${row.label}-${i}`}
            className="py-2.5"
            style={{ borderTop: i ? `1px solid ${line}` : undefined }}
          >
            <p className="text-[11px] uppercase tracking-wide" style={{ color: soft }}>
              {row.label}
            </p>
            <p className="break-words text-[13.5px] font-semibold" style={{ color: textColor }}>
              {row.value}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
