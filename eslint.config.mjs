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
    files: [
      "components/ui/use-on-screen.ts",
      "components/ui/relative-time.tsx",
      "components/ui/backdrop.tsx",
      "components/ui/button.tsx",
      "components/ui/card-link.tsx",
      "components/ui/github.tsx",
      "components/ui/image.tsx",
      "components/ui/image-animation.tsx",
      "components/ui/image-intent.tsx",
      "components/ui/key-router.tsx",
      "components/ui/machine-pressure.ts",
      "components/ui/material.tsx",
      "components/ui/material-glass.tsx",
      "components/ui/media-captions.tsx",
      "components/ui/media-timebase.tsx",
      "components/ui/pinch-input.ts",
      "components/ui/playback.tsx",
      "components/ui/popover.tsx",
      "components/ui/portal.tsx",
      "components/ui/reactions.tsx",
      "components/ui/remembered.tsx",
      "components/ui/sound-source.tsx",
      "components/ui/spinner.tsx",
      "components/ui/tweet.tsx",
      "components/ui/use-audible.ts",
      "components/ui/video.tsx",
      "components/ui/video-playback.tsx",
      "components/ui/water.tsx",
      "components/ui/web-preview.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
    },
  },
  globalIgnores([".next/**", "next-env.d.ts"]),
]);
