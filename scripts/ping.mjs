import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

try {
  const rows = await sql`select 1 as ok`;
  console.log("connessione:", rows[0]?.ok === 1 ? "ok" : "risposta inattesa");
} catch (error) {
  console.log("connessione fallita:", error?.code ?? "errore sconosciuto");
  process.exit(1);
}
