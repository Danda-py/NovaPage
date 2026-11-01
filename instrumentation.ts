import { logError } from "@/lib/store";

/** Errori non gestiti di route e server component finiscono nel log applicativo. */
export async function onRequestError(
  error: unknown,
  request: { path?: string; method?: string },
  context?: { routePath?: string; routerKind?: string },
) {
  const message = error instanceof Error ? error.message : String(error);
  const detail = error instanceof Error ? error.stack : undefined;
  const where = [request?.method, context?.routePath ?? request?.path].filter(Boolean).join(" ");

  await logError({
    source: `request:${where || "sconosciuta"}`,
    message,
    detail,
  });
}
