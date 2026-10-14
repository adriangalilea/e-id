import { EmojiDomain } from "@/components/brand";
import { Copy } from "@/components/ui/copy";
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
