import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getVersion, getVersionByMessage, listVersions, updateSite } from "@/lib/store";
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

/**
 * Ripristina una versione: prima di sovrascrivere, la pagina attuale entra in
 * cronologia. Si può indicare una versione precisa (`versionId`) oppure il
 * messaggio della chat (`messageId`), che è come l'utente ragiona nell'editor.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const guard = await requireSite(id);
  if (!guard.ok) return denied(guard.reason);

  const body = (await req.json().catch(() => null)) as {
    versionId?: string;
    messageId?: string;
  } | null;

  const config = body?.messageId
    ? await getVersionByMessage(id, body.messageId)
    : body?.versionId
      ? await getVersion(id, body.versionId)
      : null;
  if (!config) {
    return NextResponse.json(
      { error: body?.messageId ? "Nessuna copia per quel messaggio" : "Versione non trovata" },
      { status: 404 },
    );
  }

  const site = await updateSite(id, { config });
  if (!site) return NextResponse.json({ error: "Sito non trovato" }, { status: 404 });
  revalidateTag(`site:${site.slug}`, { expire: 0 });
  return NextResponse.json({ site });
}
