import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "");
const stub = (name: string) => fileURLToPath(new URL(`tests/stubs/${name}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Moduli solo-server di Next: nei test vengono sostituiti da stub innocui.
      { find: /^server-only$/, replacement: stub("server-only.ts") },
      { find: /^next\/headers$/, replacement: stub("next-headers.ts") },
      { find: /^@\//, replacement: `${root}/` },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
