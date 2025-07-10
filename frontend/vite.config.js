import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    host: "0.0.0.0",
    watch: {
      usePolling: true,
      interval: 100,
    },
    // Only apply proxy in development
    ...(process.env.NODE_ENV === "development" && {
      proxy: {
        "/api": {
          target: import.meta.env.VITE_BACKEND_URL || "http://backend:8080",
          changeOrigin: true,
        },
      },
    }),
  },
});
