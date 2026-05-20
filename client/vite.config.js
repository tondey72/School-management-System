var _a, _b;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/api": {
                target: (_a = process.env.VITE_PROXY_TARGET) !== null && _a !== void 0 ? _a : "http://localhost:4000",
                changeOrigin: true
            },
            "/socket.io": {
                target: (_b = process.env.VITE_PROXY_TARGET) !== null && _b !== void 0 ? _b : "http://localhost:4000",
                changeOrigin: true,
                ws: true
            }
        }
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src")
        }
    }
});
