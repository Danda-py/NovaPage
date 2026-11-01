/**
 * `fetch` lancia quando la rete cade. In un componente che ha appena messo il
 * bottone su "…" questo significa un errore non gestito e uno stato di
 * caricamento eterno: qui l'errore diventa un valore, così ogni chiamante può
 * mostrare un messaggio e rimettere il pulsante a posto.
 */
export type JsonResult<T> = { ok: boolean; status: number; data: T };

export async function requestJson<T = Record<string, unknown>>(
  url: string,
  init?: RequestInit,
): Promise<JsonResult<T>> {
  try {
    const res = await fetch(url, init);
    const data = (await res.json().catch(() => ({}))) as T;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: {} as T };
  }
}

/** Come `requestJson`, per le richieste senza corpo JSON (DELETE, upload). */
export async function safeFetch(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, init);
  } catch {
    return null;
  }
}
