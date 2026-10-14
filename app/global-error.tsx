"use client";

import { useEffect } from "react";
import { PageLight } from "@/components/light";
import { Broken } from "@/components/notice";
import { MaterialProvider } from "@/components/ui/material";
import { FONT_VARIABLES } from "./fonts";
import "./globals.css";

// The root layout itself threw: this document replaces it, so it brings what the
// layout gives every page (the faces, the styles, the dark theme, the ground's
// light, the glass) and
// nothing that could be what broke (the bar, the session, analytics).

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en" className={`${FONT_VARIABLES} dark`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <title>something went wrong · e-ID</title>
        <PageLight />
        <MaterialProvider material="glass">
          <Broken digest={error.digest} retry={retry} />
        </MaterialProvider>
      </body>
    </html>
  );
}
