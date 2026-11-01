import { ImageResponse } from "next/og";
import { getSiteBySlug } from "@/lib/store";

export const alt = "Anteprima della pagina";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSiteBySlug(slug).catch(() => null);

  const title = site?.config.meta.title ?? "NovaPage";
  const description = site?.config.meta.description ?? "";
  const bg = site?.config.theme.bg_color ?? "#08070f";
  const text = site?.config.theme.text_color ?? "#f3f0ff";
  const accent = site?.config.theme.accent_color ?? "#8b5cf6";
  const accent2 = site?.config.theme.accent2 ?? "#22d3ee";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: bg,
          backgroundImage: `radial-gradient(60% 60% at 12% 0%, ${accent}55, transparent 70%), radial-gradient(50% 50% at 95% 15%, ${accent2}44, transparent 70%)`,
          padding: "72px",
          color: text,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, letterSpacing: 4 }}>
          <div
            style={{
              width: 18,
              height: 18,
              transform: "rotate(45deg)",
              backgroundColor: accent,
              borderRadius: 3,
            }}
          />
          <span style={{ textTransform: "uppercase", opacity: 0.75 }}>NovaPage</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 82, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2 }}>{title}</div>
          {description && (
            <div style={{ fontSize: 30, lineHeight: 1.35, opacity: 0.72, maxWidth: 900 }}>{description}</div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24 }}>
          <span style={{ opacity: 0.5 }}>/{slug}</span>
          <span style={{ color: accent }}>Creato con NovaPage</span>
        </div>
      </div>
    ),
    size,
  );
}
