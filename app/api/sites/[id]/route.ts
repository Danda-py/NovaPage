import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { deleteSite, isSlugAvailable, slugify, updateSite } from "@/lib/store";
import { requireSite } from "@/lib/guard";
import { normalizeSite, withLegalAck, type Site } from "@/lib/site";
import { sanitizeHtmlStrict } from "@/lib/html-strict";
import { riskyMarkup } from "@/lib/moderation";
import { collectImageUrls } from "@/lib/images";
import { deleteStoredImages } from "@/lib/storage";

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
    // Il parser passa sui contenuti scritti: è l'ultimo controllo prima del database.
    if (normalized.html) normalized.html = sanitizeHtmlStrict(normalized.html);

    const blocked = riskyMarkup(normalized.html ?? "");
    if (blocked) return NextResponse.json({ error: blocked }, { status: 422 });

    config = withLegalAck(guard.site.config, normalized, {
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
  }

  // La disponibilità si verifica prima del salvataggio: il suffisso automatico
  // della creazione qui confonderebbe (l'utente scrive un link e ne ottiene un altro).
  if (body.slug !== undefined && typeof body.slug !== "string") {
    return NextResponse.json({ error: "Indirizzo non valido" }, { status: 400 });
  }
  if (typeof body.slug === "string") {
    const requested = slugify(body.slug);
    if (!(await isSlugAvailable(requested, id))) {
      return NextResponse.json(
        { error: "Questo indirizzo è già in uso: scegline un altro" },
        { status: 409 },
      );
    }
  }

  const site = await updateSite(id, {
    config,
    slug: typeof body.slug === "string" ? body.slug.slice(0, 60) : undefined,
    title: typeof body.title === "string" ? body.title.slice(0, 80) : undefined,
    published: typeof body.published === "boolean" ? body.published : undefined,
  });
  if (!site) return NextResponse.json({ error: "Sito non trovato" }, { status: 404 });

  // La pagina pubblica è in cache per slug: salvataggio, rinomina e bozza devono
  // invalidarla subito, non alla scadenza.
  revalidateTag(`site:${site.slug}`, { expire: 0 });
  if (guard.site.slug !== site.slug) revalidateTag(`site:${guard.site.slug}`, { expire: 0 });
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
  // Le immagini caricate non hanno un legame nel database: senza questa pulizia
  // restano nello storage (e vengono fatturate) per sempre.
  await deleteStoredImages(collectImageUrls(guard.site.config));
  revalidateTag(`site:${guard.site.slug}`, { expire: 0 });
  return NextResponse.json({ ok: true });
}
