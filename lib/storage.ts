import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function storageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Salva l'immagine su Vercel Blob quando c'è il token; altrimenti su disco,
 * che va bene solo in locale (su serverless il filesystem è read-only).
 */
export async function saveImage(file: File): Promise<string> {
  const ext = EXTENSIONS[file.type];
  if (!ext) throw new Error("Formato non supportato: usa JPG, PNG, WebP o GIF");
  const name = `${randomUUID()}.${ext}`;

  if (storageConfigured()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${name}`, file, {
      access: "public",
      contentType: file.type,
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
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}
