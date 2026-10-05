import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: "public",
  build: {
    rollupOptions: {
      input: {
        scoreboard: resolve(process.cwd(), "index.html"),
        draft: resolve(process.cwd(), "draft.html"),
        cards: resolve(process.cwd(), "cards.html"),
        votes: resolve(process.cwd(), "votes.html"),
        rules: resolve(process.cwd(), "rules.html"),
        sources: resolve(process.cwd(), "sources.html")
      }
    }
  }
});
