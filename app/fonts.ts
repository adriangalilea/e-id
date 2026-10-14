import { Space_Grotesk, Space_Mono } from "next/font/google";

// The site's two faces, as CSS variables on <html>: set by the root layout and by
// global-error, which stands in for it with a document of its own.

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
});

export const FONT_VARIABLES = `${spaceGrotesk.variable} ${spaceMono.variable}`;
