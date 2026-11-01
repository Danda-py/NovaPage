import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Le immagini caricate finiscono sul sito pubblico così come sono, senza il
 * ottimizzatore di Next (le landing in HTML libero non passano da `next/image`).
 * Qui, al momento del caricamento, produciamo una scala di varianti WebP: la
 * pagina può così servire 400px a un telefono e 1600px a un retina, invece di
 * scaricare sempre il file originale da 4 MB.
 */
const WIDTHS = [400, 800, 1600];

export function storageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Il MIME dichiarato dal browser è solo un'etichetta: va confrontato coi byte. */
export class UnsupportedImageError extends Error {
  constructor() {
    super("Il file non è un'immagine leggibile");
    this.name = "UnsupportedImageError";
  }
}

export type ImageType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/** Riconosce il formato dai magic byte, senza fidarsi di `file.type`. */
export function detectImageType(buffer: Buffer): ImageType | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }

  const head = buffer.subarray(0, 6).toString("latin1");
  if (head === "GIF87a" || head === "GIF89a") return "image/gif";

  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

async function persist(name: string, body: Buffer): Promise<string> {
  if (storageConfigured()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${name}`, body, {
      access: "public",
      contentType: "image/webp",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_UPLOADS) {
    throw new Error(
      "Storage non configurato: imposta BLOB_READ_WRITE_TOKEN per salvare le immagini in produzione.",
    );
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), body);
  return `/uploads/${name}`;
}

/**
 * Salva l'immagine in varianti WebP e restituisce l'URL della più grande.
 * Le sorelle sono ricavabili dal nome (`<id>-<larghezza>.webp`), quindi
 * `srcSet` può ricostruirle senza salvare altri metadati nel JSON del sito.
 */
export async function saveImage(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!detectImageType(buffer)) throw new UnsupportedImageError();

  const { default: sharp } = await import("sharp");
  const meta = await sharp(buffer).metadata().catch(() => null);
  const sourceWidth = meta?.width ?? 0;
  if (!sourceWidth) throw new UnsupportedImageError();

  const widths = WIDTHS.filter((width) => sourceWidth >= width);
  // Sotto i 400px teniamo la larghezza reale: dichiarare 400 su una foto da
  // 200px sarebbe una bugia che il browser paga in nitidezza.
  const targets = widths.length ? widths : [Math.min(sourceWidth, 400)];
  const base = randomUUID();

  let largest = "";
  for (const width of targets) {
    const body = await sharp(buffer, { animated: false })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer();
    largest = await persist(`${base}-${width}.webp`, body);
  }

  return largest;
}
