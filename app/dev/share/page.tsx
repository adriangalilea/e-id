// DEVELOPMENT PAGE, never in production: every person's share image (the
// profile's opengraph-image, lib/card-image) at the size a link preview is drawn,
// one per handle, so a long name, no photo, no country and many places are all seen.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUsernames } from "@/lib/data";

export const metadata: Metadata = { title: "share images", robots: "noindex" };

export default async function ShareImages() {
  if (process.env.NODE_ENV === "production") notFound();
  const usernames = await getUsernames();
  return (
    <main className="mx-auto grid w-full max-w-[1240px] gap-10 px-5 py-10">
      {usernames.map((username) => (
        <figure key={username} className="grid gap-2">
          {/* biome-ignore lint/performance/noImgElement: the PNG as a preview shows it, untouched */}
          <img
            src={`/${username}/opengraph-image`}
            alt={`${username}'s share image`}
            width={1200}
            height={630}
            loading="lazy"
            className="h-auto w-full rounded-xl"
          />
          <figcaption className="font-mono text-sm text-foreground/50">
            {username}
          </figcaption>
        </figure>
      ))}
    </main>
  );
}
