import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Le pagine private non vanno crawlate; le landing sotto /s/ restano aperte.
        disallow: ["/api/", "/dashboard", "/editor/", "/sites/", "/login", "/forgot", "/reset"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
