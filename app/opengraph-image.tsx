import { ImageResponse } from "next/og";

export const alt = "NovaPage: la landing page della tua attività, scritta in chat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Immagine di anteprima del sito di marketing (OpenGraph e Twitter). */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#08070f",
          backgroundImage:
            "radial-gradient(60% 60% at 12% 0%, rgba(139,92,246,0.35), transparent 70%), radial-gradient(50% 50% at 95% 15%, rgba(34,211,238,0.22), transparent 70%)",
          padding: "72px",
          color: "#f3f0ff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, letterSpacing: 4 }}>
          <div
            style={{
              width: 18,
              height: 18,
              transform: "rotate(45deg)",
              backgroundColor: "#8b5cf6",
              borderRadius: 3,
            }}
          />
          <span style={{ textTransform: "uppercase", opacity: 0.75 }}>NovaPage</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 960 }}>
            La tua landing page, scritta in chat.
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.35, opacity: 0.72, maxWidth: 880 }}>
            Descrivi l&apos;attività: sezioni, testi, orari, contatti e statistiche in una pagina pronta
            per la bio.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24 }}>
          <span style={{ opacity: 0.5 }}>novapage.site</span>
          <span style={{ color: "#a78bfa" }}>Beta gratuita</span>
        </div>
      </div>
    ),
    size,
  );
}
