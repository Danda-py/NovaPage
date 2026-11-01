import { NextResponse } from "next/server";
import { countSites, createSite, duplicateSite, listSites } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { PLANS, siteLimitReached } from "@/lib/plans";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });
  return NextResponse.json({ sites: await listSites(user.id) });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    duplicateOf?: string;
    template?: string;
  } | null;

  // Il limite è del piano, non del client: la dashboard può mostrare altro, qui si blocca.
  const used = await countSites(user.id);
  if (siteLimitReached(user.plan, used)) {
    return NextResponse.json(
      {
        error:
          user.plan === "free"
            ? `Il piano ${PLANS.free.label} include ${PLANS.free.sites} landing: per crearne un'altra serve il piano ${PLANS.pro.label}.`
            : "Limite di landing raggiunto",
        plan: user.plan,
      },
      { status: 403 },
    );
  }

  if (typeof body?.duplicateOf === "string" && body.duplicateOf) {
    const copy = await duplicateSite(body.duplicateOf, user.id);
    if (!copy) return NextResponse.json({ error: "Sito non trovato" }, { status: 404 });
    return NextResponse.json({ site: copy }, { status: 201 });
  }

  const site = await createSite(
    user.id,
    body?.title ?? "La mia pagina",
    typeof body?.template === "string" ? body.template : undefined,
  );
  return NextResponse.json({ site }, { status: 201 });
}
