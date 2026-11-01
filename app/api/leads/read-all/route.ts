import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markAllLeadsReadForOwner } from "@/lib/store";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const limit = await rateLimit(`leads-read-all:${user.id}:${clientIp(req)}`, 60, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });

  const updated = await markAllLeadsReadForOwner(user.id);
  return NextResponse.json({ updated });
}
