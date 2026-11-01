import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/site-url";

const TITLE = "NovaPage — landing page per la tua attività, create in chat";
const DESCRIPTION =
  "Crea la landing page della tua attività parlando con un assistente AI: testi, colori, contatti e statistiche. Online in un minuto, con un link da condividere.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: TITLE, template: "%s · NovaPage" },
  description: DESCRIPTION,
  applicationName: "NovaPage",
  category: "technology",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    siteName: "NovaPage",
    locale: "it_IT",
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
  // Nessun robots qui: con lo streaming il layout e la pagina emettono entrambi
  // il tag e una pagina noindex si ritroverebbe anche un "index, follow".
  // Il default è già indicizzabile; chi deve escludersi lo dichiara nella pagina.
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full bg-zinc-950">{children}</body>
    </html>
  );
}
