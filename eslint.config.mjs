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
    // Every file in components/ui is installed from a registry (@ag,
    // ui.adriangalilea.com, and shadcn's) and refreshed with `shadcn add
    // --overwrite`, so it is linted where it is written, not here: the React
    // Compiler's rules, which that source is not written to (it writes to refs
    // and the DOM in handlers on purpose), are off for it. A whole folder, so a
    // new install needs no line here.
    files: ["components/ui/**"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  globalIgnores([".next/**", "next-env.d.ts"]),
]);
