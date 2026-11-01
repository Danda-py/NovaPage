import Link from "next/link";

export function Brand({
  href = "/",
  showName = true,
  className = "",
}: {
  href?: string;
  showName?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={`flex items-center gap-2 ${className}`} aria-label="NovaPage">
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute h-5 w-5 rounded-full border border-violet-500/30" />
        <span className="absolute h-2.5 w-2.5 rotate-45 rounded-[2px] bg-violet-500" />
      </span>
      {showName && <span className="text-sm font-semibold tracking-tight">NovaPage</span>}
    </Link>
  );
}

export function BrandBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-current/20 px-2.5 py-1 text-[10px] tracking-wide ${className}`}
    >
      <span className="h-1 w-1 rotate-45 rounded-[1px] bg-current" />
      Creato con NovaPage
    </span>
  );
}
