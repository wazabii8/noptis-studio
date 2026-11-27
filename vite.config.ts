import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,

      manifest: {
        name: "Noptis Studio",
        short_name: "Noptis Studio",
        description: "Noptis Studio",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        id: "/noptis-studio/",
        start_url: "/noptis-studio/",
        scope: "/noptis-studio/",
        icons: [
          {
            src: "web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "screenshots/01-gid-inspector.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide",
            label: "GID inspector with a saved vehicle GID and example identifiers",
          },
          {
            src: "screenshots/02-gid-details.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide",
            label: "Vehicle GID broken into prefix, transport authority, operator, and vehicle number",
          },
          {
            src: "screenshots/03-gid-layouts.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide",
            label: "GID layouts showing the color-coded digit positions for each identifier type",
          },
          {
            src: "screenshots/04-noptis-queries.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide",
            label: "Saved NOPTIS queries with a SQL query expanded",
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webmanifest}"],
        globIgnores: ["**/node_modules/**/*", "screenshots/**"],
      },
    }),
  ],

  base: "/noptis-studio/",

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
