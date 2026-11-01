import { rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";
import { srcSetFor } from "@/lib/images";
import { saveImage } from "@/lib/storage";

describe("srcSetFor", () => {
  it("ricostruisce le varianti dalla più grande disponibile", () => {
    const set = srcSetFor("https://blob.example.com/uploads/abc-1600.webp");
    expect(set).toBe(
      "https://blob.example.com/uploads/abc-400.webp 400w, https://blob.example.com/uploads/abc-800.webp 800w, https://blob.example.com/uploads/abc-1600.webp 1600w",
    );
  });

  it("non inventa varianti più grandi del file salvato", () => {
    expect(srcSetFor("/uploads/abc-800.webp")).toBe("/uploads/abc-400.webp 400w, /uploads/abc-800.webp 800w");
  });

  it("lascia perdere le immagini che non sono nostre", () => {
    expect(srcSetFor("/demo/studio.webp")).toBeUndefined();
    expect(srcSetFor("https://images.unsplash.com/photo-1.jpg")).toBeUndefined();
    expect(srcSetFor("https://blob.example.com/uploads/abc-1200.webp")).toBeDefined();
  });
});

describe("saveImage", () => {
  const written: string[] = [];

  afterAll(async () => {
    await Promise.all(written.map((file) => rm(file, { force: true })));
  });

  it("crea le varianti WebP e restituisce la più grande", async () => {
    const original = await sharp({
      create: { width: 1000, height: 700, channels: 3, background: "#7c3aed" },
    })
      .jpeg()
      .toBuffer();

    const bytes = new Uint8Array(original.byteLength);
    bytes.set(original);
    const url = await saveImage(new File([bytes], "foto.jpg", { type: "image/jpeg" }));
    expect(url).toMatch(/^\/uploads\/[a-z0-9-]+-\d+\.webp$/);

    const widest = Number(url.match(/-(\d+)\.webp$/)?.[1]);
    expect(widest).toBe(800); // la sorgente è 1000px: 1600 non si inventa

    const base = url.slice(0, url.length - "-800.webp".length);
    for (const width of [400, 800]) {
      const file = path.join(process.cwd(), "public", `${base}-${width}.webp`);
      written.push(file);
      const meta = await sharp(file).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(width);
    }

    expect(srcSetFor(url)).toContain("-400.webp 400w");
  });
});
