import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // Installed from the @ag registry (ui.adriangalilea.com) and refreshed with
    // `shadcn add --overwrite`, so it is linted where it is written, not here.
    files: ["components/ui/use-on-screen.ts", "components/ui/relative-time.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  globalIgnores([".next/**", "next-env.d.ts"]),
]);
