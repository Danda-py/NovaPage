import { getCurrentUser } from "./auth";
import { getSite } from "./store";

export async function requireSite(siteId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, reason: "auth" as const };
  const site = await getSite(siteId);
  if (!site || site.ownerId !== user.id) return { ok: false as const, reason: "missing" as const };
  return { ok: true as const, user, site };
}
