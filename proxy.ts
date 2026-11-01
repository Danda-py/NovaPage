import { NextResponse, type NextRequest } from "next/server";
import { publishedSlugExists } from "@/lib/slug-cache";
import { notFoundHtml } from "@/lib/not-found-html";

const SESSION_COOKIE = "np_session";

export async function proxy(req: NextRequest) {
  // Una landing che non esiste deve rispondere 404 prima che parta lo streaming:
  // dentro la pagina lo stato HTTP è già stato inviato (sarebbe una soft 404).
  const slug = req.nextUrl.pathname.match(/^\/s\/([^/]+)/)?.[1];
  if (slug) {
    if (!(await publishedSlugExists(decodeURIComponent(slug)))) {
      // Un rewrite conserva lo stato 200: qui serve una risposta propria.
      return new NextResponse(notFoundHtml(), {
        status: 404,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=0, s-maxage=60",
        },
      });
    }
    // Le landing pubbliche non passano dal controllo di sessione.
    return NextResponse.next();
  }

  const hasSession = req.cookies.has(SESSION_COOKIE);
  if (hasSession) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/s/:path*", "/dashboard/:path*", "/editor/:path*", "/sites/:path*"],
};
