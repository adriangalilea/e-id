import { EmojiDomain } from "@/components/brand";
import { Copy } from "@/components/ui/copy";
import type { SocialPlatform } from "@/db/schema";
import { shortName } from "@/lib/place-names";
import { getSocialIcon } from "@/lib/socials";
import { EMOJI_DOMAIN, EMOJI_DOMAIN_PUNYCODE, PROD_URL } from "@/lib/const";

/** A person's e-ID addresses, every form that opens their page, each where it
 *  works best: 👤.to everywhere (next.config sends every browser but Safari on
 *  to e-id.to), e-id.to where an emoji is not welcome, and the emoji domain
 *  spelled out (punycode) for a bio that drops emoji. Each a real link, its
 *  own copy beside it (@ag/copy). One list, the share menu's and the home's. */
export function addressesOf(username: string) {
  return [
    {
      what: "everywhere",
      shown: <EmojiDomain path={`/${username}`} />,
      url: `https://${EMOJI_DOMAIN}/${username}`,
    },
    {
      what: "where emoji are not welcome",
      shown: `e-id.to/${username}`,
      url: `${PROD_URL}/${username}`,
    },
    {
      what: "in a bio that drops emoji",
      shown: `${EMOJI_DOMAIN_PUNYCODE}/${username}`,
      url: `https://${EMOJI_DOMAIN_PUNYCODE}/${username}`,
    },
  ];
}

/** Each of a person's places straight from their address (app/[username]/
 *  [place], by its shortest name: lib/place-names), and where it goes: the
 *  short address, an arrow, the place's own address, so what it does is read
 *  off the line. Each a link that opens it, its icon before it. */
export function PlaceAddresses({
  username,
  places,
}: {
  username: string;
  places: { platform: SocialPlatform; url: string }[];
}) {
  // The first of each kind, as the redirect takes it.
  const first = places.filter(
    (p, i) => places.findIndex((q) => q.platform === p.platform) === i,
  );
  return (
    <ul className="flex flex-col">
      {first.map(({ platform, url }) => {
        const name = shortName(platform);
        return (
          <li
            key={platform}
            className="border-b border-border py-3 last:border-b-0"
          >
            <a
              href={`/${username}/${name}`}
              className="group/place flex min-w-0 items-center gap-3 font-mono text-sm"
            >
              <span
                aria-hidden
                className="flex shrink-0 text-foreground/50 [&_svg]:size-4"
              >
                {getSocialIcon(platform)}
              </span>
              <span className="shrink-0 text-foreground/90 underline decoration-foreground/25 underline-offset-[0.3em] transition-colors group-hover/place:decoration-foreground/70">
                <EmojiDomain path={`/${username}/`} />
                {name}
              </span>
              <span aria-hidden className="shrink-0 text-foreground/35">
                →
              </span>
              <span className="min-w-0 truncate text-foreground/45">
                {url.replace(/^(https?:\/\/|mailto:)(www\.)?/, "")}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** The addresses as a list: each one a link, what it is for under it, and its
 *  copy. `size` the address's type: the share menu's small, the home's large. */
export function Addresses({
  username,
  size = "sm",
}: {
  username: string;
  size?: "sm" | "lg";
}) {
  return (
    <ul className="flex flex-col">
      {addressesOf(username).map((address) => (
        <li
          key={address.url}
          className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
        >
          <div className="flex min-w-0 grow flex-col gap-1">
            <a
              href={address.url}
              className={
                size === "lg"
                  ? "w-fit truncate font-mono text-xl text-foreground/90 underline decoration-foreground/25 underline-offset-[0.3em] transition-colors hover:decoration-foreground/70"
                  : "w-fit truncate font-mono text-sm text-foreground/90 underline decoration-foreground/25 underline-offset-[0.3em] transition-colors hover:decoration-foreground/70"
              }
            >
              {address.shown}
            </a>
            <span className="text-xs text-foreground/45">{address.what}</span>
          </div>
          <Copy value={address.url} label className="rounded-full" />
        </li>
      ))}
    </ul>
  );
}
