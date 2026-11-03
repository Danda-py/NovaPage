import { NextResponse, type NextRequest } from "next/server";
import { customDomainSlug, publishedSlugExists } from "@/lib/slug-cache";
import { notFoundHtml } from "@/lib/not-found-html";
import { siteUrl } from "@/lib/site-url";
import { isPlatformHost } from "@/lib/domain";

const SESSION_COOKIE = "np_session";

/** Una pagina che non esiste deve rispondere 404 prima che parta lo streaming. */
function notFound() {
  return new NextResponse(notFoundHtml(), {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=60",
    },
  });
}

export async function proxy(req: NextRequest) {
  // Su Vercel l'host originale arriva in `x-forwarded-host`; in locale `host`.
  // Il primo valore di una lista è quello del client.
  const forwarded = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = (forwarded || req.headers.get("host") || "").split(":")[0].toLowerCase();
  let platform = "";
  try {
    platform = new URL(siteUrl()).hostname.toLowerCase();
  } catch {
    platform = "";
  }

  // Dominio personalizzato: stessa pagina, indirizzo dell'utente. Anteprime Vercel
  // e localhost restano sul percorso normale.
  const isPreview = !host || host.endsWith(".vercel.app") || host === "localhost" || host === "127.0.0.1";
  // `www.novapage.site` è la piattaforma, non un dominio di un cliente: senza
  // questo confronto la home con il www risponderebbe 404.
  const isPlatform = isPlatformHost(host, platform);
  if (host && !isPlatform && !isPreview) {
    const slug = await customDomainSlug(host);
    if (!slug) return notFound();

    const url = req.nextUrl.clone();
    const rest = req.nextUrl.pathname === "/" ? "" : req.nextUrl.pathname;

    // Un vecchio link `/s/{slug}` sul dominio del cliente non deve mostrare
    // un'altra pagina né duplicare l'indirizzo: si reindirizza alla radice.
    if (rest.startsWith("/s/")) {
      const match = rest.match(/^\/s\/([^/]+)(\/.*)?$/);
      const inner = match?.[1] ? decodeURIComponent(match[1]) : "";
      if (!inner || inner.toLowerCase() !== slug.toLowerCase()) return notFound();
      const target = req.nextUrl.clone();
      target.pathname = match?.[2] || "/";
      return NextResponse.redirect(target, 308);
    }

    // Le aree private appartengono alla piattaforma: su un dominio del cliente non
    // si servono, si riporta l'utente sull'indirizzo giusto.
    const appPath = [
      "/login",
      "/register",
      "/account",
      "/dashboard",
      "/editor",
      "/leads",
      "/sites",
      "/forgot",
      "/reset",
      "/conferma-email",
    ].some((prefix) => rest === prefix || rest.startsWith(`${prefix}/`));
    if (appPath && platform) {
      try {
        const target = new URL(rest + req.nextUrl.search, siteUrl());
        return NextResponse.redirect(target);
      } catch {
        // URL pubblico non configurato: meglio la pagina del sito che un errore.
      }
    }

    url.pathname = `/s/${slug}${rest}`;
    return NextResponse.rewrite(url);
  }

  // Una landing che non esiste deve rispondere 404 prima che parta lo streaming:
  // dentro la pagina lo stato HTTP è già stato inviato (sarebbe una soft 404).
  const slug = req.nextUrl.pathname.match(/^\/s\/([^/]+)/)?.[1];
  if (slug) {
    if (!(await publishedSlugExists(decodeURIComponent(slug)))) {
      // Un rewrite conserva lo stato 200: qui serve una risposta propria.
      return notFound();
    }
    // Le landing pubbliche non passano dal controllo di sessione.
    return NextResponse.next();
  }

  // Il matcher copre tutte le pagine (serve a riconoscere un host personalizzato
  // anche su "/"), quindi il filtro di sessione va applicato solo alle aree private.
  const privatePath = ["/dashboard", "/editor", "/sites"].some(
    (prefix) => req.nextUrl.pathname === prefix || req.nextUrl.pathname.startsWith(`${prefix}/`),
  );
  if (!privatePath) return NextResponse.next();

  const hasSession = req.cookies.has(SESSION_COOKIE);
  if (hasSession) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Tutto tranne API, asset statici e file con estensione.
  matcher: ["/", "/((?!api|_next|.*\\..*).*)"],
};
