import { NextResponse } from "next/server";
import { createSite, listSites } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });
  return NextResponse.json({ sites: await listSites(user.id) });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { title?: string } | null;
  const site = await createSite(user.id, body?.title ?? "La mia pagina");
  return NextResponse.json({ site }, { status: 201 });
}
