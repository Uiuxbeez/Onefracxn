import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync } from "node:fs";
export default defineConfig({
  optimizeDeps: { entries: ["index.html"] },
  plugins: [
    react(),
    {
      name: "existing-images",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.split("?")[0] === "/property/skanda.html") {
            res.writeHead(302, { Location: "/properties/skanda-1" });
            res.end();
          } else next();
        });
      },
      closeBundle() {
        cpSync("assets", "dist/assets", { recursive: true });
      },
    },
  ],
  server: { proxy: { "/api": "http://localhost:3001" } },
  preview: { proxy: { "/api": "http://localhost:3001" } },
});
