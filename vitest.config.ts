import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const alias = { "@": path.resolve(__dirname, "./src") };

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    globals: true,
    projects: [
      {
        // Pruebas unitarias — funciones puras y componentes React (jsdom)
        plugins: [react()],
        test: {
          name: "unit",
          globals: true,
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          include: [
            "src/**/*.{test,spec}.{ts,tsx}",
            "tests/lib/**/*.test.ts",
          ],
        },
        resolve: { alias },
      },
      {
        // Pruebas de integración — cliente mock en memoria (sin Supabase real)
        // En producción: conectar a Supabase real con tests/.env.test
        plugins: [react()],
        test: {
          name: "integration",
          environment: "jsdom",
          env: {
            VITE_DEMO_MODE: "true",
          },
          globalSetup: ["./tests/globalSetup.ts"],
          setupFiles: ["./tests/setup.ts"],
          testTimeout: 15000,
          hookTimeout: 15000,
          fileParallelism: false,
          include: [
            "tests/auth/**/*.test.ts",
            "tests/modules/**/*.test.ts",
            "tests/storage/**/*.test.ts",
            "tests/security/**/*.test.ts",
          ],
        },
        resolve: { alias },
      },
    ],
  },
});
