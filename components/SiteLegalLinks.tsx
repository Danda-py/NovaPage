import Link from "next/link";

/**
 * Link alle pagine legali generate per la landing. Stanno nel flusso della
 * pagina, non sopra: non coprono nulla e ogni visitatore può raggiungerle.
 */
export function SiteLegalLinks({ slug, light }: { slug: string; light?: boolean }) {
  const base = light ? "text-zinc-600" : "text-zinc-400";
  const line = light ? "border-black/10" : "border-white/10";
  const link = light ? "text-zinc-800 hover:text-black" : "text-zinc-200 hover:text-white";

  return (
    <nav
      aria-label="Informazioni legali"
      className={`border-t ${line} px-4 py-5 text-center text-[11px] leading-relaxed ${base}`}
    >
      <span className="mr-1">
        <Link href="/" className={`${link} underline-offset-2 hover:underline`}>
          NovaPage
        </Link>
        {" · "}
        <Link href={`/s/${slug}/privacy`} className={`${link} underline-offset-2 hover:underline`}>
          Privacy
        </Link>
        {" · "}
        <Link href={`/s/${slug}/cookie`} className={`${link} underline-offset-2 hover:underline`}>
          Cookie
        </Link>
        {" · "}
        <Link href={`/s/${slug}/termini`} className={`${link} underline-offset-2 hover:underline`}>
          Termini
        </Link>
      </span>
    </nav>
  );
}
