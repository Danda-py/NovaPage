import { NextResponse } from "next/server";
import { getVersion, listVersions, updateSite } from "@/lib/store";
import { requireSite } from "@/lib/guard";

type Ctx = { params: Promise<{ id: string }> };

function denied(reason: "auth" | "missing") {
  return NextResponse.json(
    { error: reason === "auth" ? "Autenticazione richiesta" : "Sito non trovato" },
    { status: reason === "auth" ? 401 : 404 },
  );
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const guard = await requireSite(id);
  if (!guard.ok) return denied(guard.reason);
  return NextResponse.json({ versions: await listVersions(id) });
}

/** Ripristina una versione: prima di sovrascrivere, la pagina attuale entra in cronologia. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const guard = await requireSite(id);
  if (!guard.ok) return denied(guard.reason);

  const body = (await req.json().catch(() => null)) as { versionId?: string } | null;
  if (!body?.versionId) return NextResponse.json({ error: "versionId mancante" }, { status: 400 });

  const config = await getVersion(id, body.versionId);
  if (!config) return NextResponse.json({ error: "Versione non trovata" }, { status: 404 });

  const site = await updateSite(id, { config });
  if (!site) return NextResponse.json({ error: "Sito non trovato" }, { status: 404 });
  return NextResponse.json({ site });
}
