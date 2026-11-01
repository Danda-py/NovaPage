import { describe, expect, it } from "vitest";
import { isTransientError, withRetry } from "@/lib/db";

function networkError(message = "fetch failed", code?: string) {
  return Object.assign(new TypeError(message), { cause: code ? { code } : undefined });
}

describe("retry sulle query", () => {
  it("riconosce gli errori di rete, anche annidati nella causa", () => {
    expect(isTransientError(networkError())).toBe(true);
    expect(isTransientError(networkError("boom", "ETIMEDOUT"))).toBe(true);
    expect(isTransientError(new Error("violates not-null constraint"))).toBe(false);
  });

  it("ritenta un errore transitorio e restituisce il risultato", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw networkError();
        return "ok";
      },
      [0, 0],
    );
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("non ritenta un errore di query", async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls += 1;
        throw new Error("sintassi SQL non valida");
      }, [0, 0]),
    ).rejects.toThrow("sintassi SQL non valida");
    expect(calls).toBe(1);
  });

  it("si arrende dopo i tentativi previsti", async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls += 1;
        throw networkError();
      }, [0, 0]),
    ).rejects.toBeInstanceOf(TypeError);
    expect(calls).toBe(3);
  });
});
