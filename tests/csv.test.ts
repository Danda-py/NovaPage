import { describe, expect, it } from "vitest";
import { leadsToCsv } from "@/lib/csv";

const base = {
  createdAt: "2026-11-01T10:00:00.000Z",
  name: "Anna",
  email: "anna@example.it",
  phone: "3331234567",
  message: "Vorrei un preventivo",
  read: false,
};

describe("leadsToCsv", () => {
  it("scrive intestazione, BOM e righe", () => {
    const csv = leadsToCsv([base]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Data","Nome","Email","Telefono","Messaggio","Letto"');
    expect(csv).toContain('"Anna"');
    expect(csv).toContain('"no"');
    expect(csv).toContain("2026-11-01T10:00:00.000Z");
  });

  it("mette su una riga sola e raddoppia le virgolette", () => {
    const csv = leadsToCsv([{ ...base, message: 'Ha detto "ciao"\ne poi è andato' }]);
    expect(csv).toContain('"Ha detto ""ciao"" e poi è andato"');
  });

  it("neutralizza i valori interpretabili come formula", () => {
    const csv = leadsToCsv([{ ...base, name: "=HYPERLINK(\"http://x\")" }]);
    expect(csv).toContain('"\'=HYPERLINK(""http://x"")"');
  });

  it("senza contatti produce solo l'intestazione", () => {
    expect(leadsToCsv([]).trim().split("\r\n")).toHaveLength(1);
  });
});
