import { NextResponse } from "next/server";
import { deleteSite, updateSite } from "@/lib/store";
import { requireSite } from "@/lib/guard";
import { normalizeSite, type Site } from "@/lib/site";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const guard = await requireSite(id);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.reason === "auth" ? "Autenticazione richiesta" : "Sito non trovato" },
      { status: guard.reason === "auth" ? 401 : 404 },
    );
  }
  return NextResponse.json({ site: guard.site });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const guard = await requireSite(id);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.reason === "auth" ? "Autenticazione richiesta" : "Sito non trovato" },
      { status: guard.reason === "auth" ? 401 : 404 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    config?: unknown;
    slug?: unknown;
    title?: unknown;
    published?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });

  let config: Site | undefined;
  if (body.config !== undefined) {
    const normalized = normalizeSite(body.config);
    if (!normalized) {
      return NextResponse.json({ error: "Configurazione della pagina non valida" }, { status: 400 });
    }
    config = normalized;
  }

  const site = await updateSite(id, {
    config,
    slug: typeof body.slug === "string" ? body.slug.slice(0, 60) : undefined,
    title: typeof body.title === "string" ? body.title.slice(0, 80) : undefined,
    published: typeof body.published === "boolean" ? body.published : undefined,
  });
  if (!site) return NextResponse.json({ error: "Sito non trovato" }, { status: 404 });
  return NextResponse.json({ site });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const guard = await requireSite(id);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.reason === "auth" ? "Autenticazione richiesta" : "Sito non trovato" },
      { status: guard.reason === "auth" ? 401 : 404 },
    );
  }
  await deleteSite(id);
  return NextResponse.json({ ok: true });
}
