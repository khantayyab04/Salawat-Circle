import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    {
      // Font packages ship `require('./Font.ttf')`, which Node cannot resolve.
      // Under test only the identity of the asset matters.
      name: "stub-font-assets",
      enforce: "pre",
      resolveId(source: string) {
        if (source.endsWith(".ttf")) return `\0font-asset:${source}`;
        return null;
      },
      load(id: string) {
        if (id.startsWith("\0font-asset:")) {
          return `export default ${JSON.stringify(id.slice(12))};`;
        }
        return null;
      },
    },
  ],
  test: {
    clearMocks: true,
    include: ["src/lib/**/*.test.ts", "src/theme/**/*.test.ts"],
    server: { deps: { inline: [/@expo-google-fonts/] } },
  },
});
