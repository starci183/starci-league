import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// main.ts dùng await ở cấp module (chờ sảnh đăng nhập) nên cần ES2022.
// React + Tailwind (shadcn) cho bảng bên phải và tooltip; Phaser vẽ bàn đấu.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { target: "es2022" },
  esbuild: { target: "es2022" },
});
