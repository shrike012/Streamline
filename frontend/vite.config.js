import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.VITE_HOST || "0.0.0.0",
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      // Proxy API calls to Flask backend
      "/api": {
        target: "http://backend:8080",
        changeOrigin: true,
      },
    },
  },
});
