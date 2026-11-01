import { describe, expect, it } from "vitest";
import { detectImageType } from "@/lib/storage";

/** Intestazione + riempimento: bastano i primi byte per il riconoscimento. */
function bytes(head: number[], size = 16): Buffer {
  const buffer = Buffer.alloc(size);
  head.forEach((value, index) => {
    buffer[index] = value;
  });
  return buffer;
}

function text(value: string, size = 16): Buffer {
  const buffer = Buffer.alloc(size);
  buffer.write(value, 0, "latin1");
  return buffer;
}

describe("detectImageType", () => {
  it("riconosce JPEG, PNG e GIF dai byte iniziali", () => {
    expect(detectImageType(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectImageType(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectImageType(text("GIF89a"))).toBe("image/gif");
    expect(detectImageType(text("GIF87a"))).toBe("image/gif");
  });

  it("riconosce WebP solo con RIFF e WEBP nella posizione giusta", () => {
    const webp = Buffer.alloc(16);
    webp.write("RIFF", 0, "latin1");
    webp.write("WEBP", 8, "latin1");
    expect(detectImageType(webp)).toBe("image/webp");

    const riffOnly = Buffer.alloc(16);
    riffOnly.write("RIFF", 0, "latin1");
    riffOnly.write("WAVE", 8, "latin1");
    expect(detectImageType(riffOnly)).toBeNull();
  });

  it("rifiuta testo, HTML e archivi", () => {
    expect(detectImageType(Buffer.from("<html><body>x</body></html>"))).toBeNull();
    expect(detectImageType(Buffer.from("PK\u0003\u0004 e poi un archivio zip"))).toBeNull();
    expect(detectImageType(Buffer.from("<?php echo 1; ?>"))).toBeNull();
  });

  it("rifiuta i file troppo corti", () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});
