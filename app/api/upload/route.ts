import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { logError } from "@/lib/store";
import { saveImage } from "@/lib/storage";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const limit = await rateLimit(`upload:${user.id}:${clientIp(req)}`, 60, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file ricevuto" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Formato non supportato: usa JPG, PNG, WebP o GIF" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Immagine troppo grande (max 4 MB)" }, { status: 413 });
  }

  try {
    const url = await saveImage(file);
    return NextResponse.json({ url });
  } catch (error) {
    await logError({ source: "upload", message: "Caricamento fallito", detail: String(error), userId: user.id });
    return NextResponse.json(
      { error: "Caricamento non disponibile: storage immagini non configurato." },
      { status: 503 },
    );
  }
}
