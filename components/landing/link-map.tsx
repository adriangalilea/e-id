"use client";

import { Image } from "@/components/ui/image";

/** A capture of a link's page in both schemes (lib/link-shots.json, written by
 *  `pnpm links`): where it is and how big each picture is. */
export type Shot = {
  src: { dark: string; light: string };
  url: string;
  dark: { width: number; height: number };
  light: { width: number; height: number };
};

/** Where one route of the address lands: its end (app/[username]/[link]: /gh),
 *  where it redirects, and what is there: the site as it really looks (`shot`),
 *  or, where nothing is captured (an email's compose window), drawn here. */
export type Landing = {
  end: string;
  url: string;
  shot?: Shot;
  page?: React.ReactNode;
};

/** ONE LINK, and where each of its routes leads: the address itself (`home`) to
 *  the card, then each route (`/gh`) to its link's real page (a capture: most
 *  sites refuse to be framed), each written as it is shared. */
export function routePages(
  home: string,
  card: React.ReactNode,
  landings: Landing[],
): { address: string; page: React.ReactNode }[] {
  return [
    {
      address: home,
      page: (
        <div className="grid min-h-full place-items-center p-6">
          <div className="w-full max-w-[18rem]">{card}</div>
        </div>
      ),
    },
    ...landings.map((l) => {
      const page = l.shot ? <Capture shot={l.shot} /> : l.page;
      if (!page) throw new Error(`link-map: ${l.end} has nothing to show`);
      return { address: `${home}/${l.end}`, page };
    }),
  ];
}

/** A link's page as captured, in the reader's scheme: both pictures in the page,
 *  one shown by the scheme (`scheme-dark:`), so a change of theme swaps them at
 *  once. Full width, its own height: the browser scrolls it. */
function Capture({ shot }: { shot: Shot }) {
  return (
    <>
      <Image
        src={shot.src.light}
        alt=""
        width={shot.light.width}
        height={shot.light.height}
        sizes="(max-width: 768px) 50vw, 640px"
        className="block h-auto w-full scheme-dark:hidden"
      />
      <Image
        src={shot.src.dark}
        alt=""
        width={shot.dark.width}
        height={shot.dark.height}
        sizes="(max-width: 768px) 50vw, 640px"
        className="hidden h-auto w-full scheme-dark:block"
      />
    </>
  );
}
