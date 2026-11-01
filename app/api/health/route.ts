import { NextResponse, connection } from "next/server";
import { pingDatabase, schemaReady } from "@/lib/store";
import { emailConfigured } from "@/lib/email";
import { storageConfigured } from "@/lib/storage";
import { aiConfigured } from "@/lib/ai";

/**
 * Stato del servizio: solo booleani, nessun valore di configurazione.
 * 200 = database raggiungibile e schema aggiornato, 503 = non pronto.
 */
export async function GET() {
  await connection();

  const database = await pingDatabase();
  const schema = database ? await schemaReady() : false;
  const checks = {
    database,
    schema,
    auth: Boolean(process.env.AUTH_SECRET),
    ai: aiConfigured(),
    email: emailConfigured(),
    storage: storageConfigured(),
  };

  const ready = database && schema;

  return NextResponse.json(
    { ok: ready, checks },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
