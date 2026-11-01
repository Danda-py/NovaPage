export type CsvLead = {
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  read: boolean;
  /** Titolo della landing: presente solo nell'export che unisce più siti. */
  site?: string;
};

const HEADER = ["Data", "Nome", "Email", "Telefono", "Messaggio", "Letto"];
const HEADER_WITH_SITE = ["Data", "Sito", "Nome", "Email", "Telefono", "Messaggio", "Letto"];

/**
 * Una cella: righe su una sola linea, virgolette raddoppiate e prefisso per i
 * valori che un foglio di calcolo interpreterebbe come formula.
 */
function cell(value: string): string {
  const clean = value.replace(/\r?\n/g, " ").trim();
  const guarded = /^[=+\-@\t]/.test(clean) ? `'${clean}` : clean;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/** CSV dei contatti con BOM, così Excel apre correttamente gli accenti. */
export function leadsToCsv(leads: CsvLead[], withSite = false): string {
  const lines = [(withSite ? HEADER_WITH_SITE : HEADER).map(cell).join(",")];
  for (const lead of leads) {
    const row = [
      new Date(lead.createdAt).toISOString(),
      lead.name,
      lead.email,
      lead.phone,
      lead.message,
      lead.read ? "sì" : "no",
    ];
    if (withSite) row.splice(1, 0, lead.site ?? "");
    lines.push(row.map(cell).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
