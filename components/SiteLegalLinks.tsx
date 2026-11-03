import Link from "next/link";
import { siteUrl } from "@/lib/site-url";

/**
 * Link alle pagine legali generate per la landing. Stanno nel flusso della
 * pagina, non sopra: non coprono nulla e ogni visitatore può raggiungerle.
 */
export function SiteLegalLinks({
  slug,
  light,
  base,
  legal,
}: {
  slug: string;
  light?: boolean;
  /** `/s/{slug}` sulla piattaforma, stringa vuota sul dominio personalizzato. */
  base?: string;
  legal?: { businessName?: string; vat?: string; address?: string };
}) {
  const prefix = base === "" ? "" : (base ?? `/s/${slug}`).replace(/\/$/, "");
  const tone = light ? "text-zinc-600" : "text-zinc-400";
  const line = light ? "border-black/10" : "border-white/10";
  const link = light ? "text-zinc-800 hover:text-black" : "text-zinc-200 hover:text-white";
  const owner = [
    legal?.businessName,
    legal?.vat ? `P.IVA ${legal.vat}` : "",
    legal?.address,
  ].filter((value): value is string => Boolean(value?.trim()));

  return (
    <nav
      aria-label="Informazioni legali"
      className={`border-t ${line} px-4 py-5 text-center text-[11px] leading-relaxed ${tone}`}
    >
      {owner.length > 0 && <span className="mb-1 block">{owner.join(" · ")}</span>}
      <span className="mr-1">
        <a href={`${siteUrl()}/`} className={`${link} underline-offset-2 hover:underline`}>
          NovaPage
        </a>
        {" · "}
        <Link href={`${prefix}/privacy`} className={`${link} underline-offset-2 hover:underline`}>
          Privacy
        </Link>
        {" · "}
        <Link href={`${prefix}/cookie`} className={`${link} underline-offset-2 hover:underline`}>
          Cookie
        </Link>
        {" · "}
        <Link href={`${prefix}/termini`} className={`${link} underline-offset-2 hover:underline`}>
          Termini
        </Link>
      </span>
    </nav>
  );
}
