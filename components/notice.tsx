"use client"

import { House, RotateCcw, SearchX, Unplug } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { EmojiDomain } from "@/components/brand"
import { CORNER } from "@/components/card-shape"
import { IdCard } from "@/components/id-card"
import { SubjectLight } from "@/components/light"
import { useChip } from "@/components/session/use-chip"
import { Button } from "@/components/ui/button"
import { HoloLean, HoloLight } from "@/components/ui/holo"
import { writeDraft } from "@/lib/draft"
import { usernameSchema } from "@/lib/username-rules"
import { cn } from "@/lib/utils"

// The pages that stand in for one that cannot be shown: an address no one holds,
// one that leads nowhere, a page that broke. Each is a card that was never issued,
// lying in the light where a profile's would, and under it what happened and the
// way on. One family, so a missing page still reads as e-id.

/** What a card says when no one holds it: the address across its head, what
 *  happened on the name's line (the page's heading), printed faint as a blank
 *  form's is, and an optional line at its foot (a document number, where a real
 *  ID keeps one). The card says it once; the page under it adds only the way on. */
function BlankCard({
  address,
  name,
  glyph,
  foot,
}: {
  address: string
  name: string
  /** In the photo's frame, what happened as a picture; the e-ID mark when none. */
  glyph?: React.ReactNode
  foot?: React.ReactNode
}) {
  return (
    // At rest a light drifts across its foil, as the home's blank card does;
    // under the hand it leans to it a few degrees, flat on a phone.
    <HoloLight className="relative w-full [--holo-floor:0.15] [&:not([data-hover])]:[--holo-floor:0.6]">
      <SubjectLight />
      <HoloLean
        pose="flat"
        className="[transform:none] group-data-[hover]/holo:[transform:var(--holo-lean)] max-lg:group-data-[hover]/holo:[transform:none]"
      >
        <div className="animate-[holo-idle_6s_ease-in-out_infinite_alternate] group-data-[hover]/holo:animate-none motion-reduce:animate-none">
          <IdCard
            heading="p"
            holo="laminate"
            // Solid, as a card lying in front of everything is, and casting its
            // shadow on the page.
            className={cn(
              CORNER,
              "[--id-card-backdrop:none] [--id-card-thickness:1]",
              "shadow-[0_0.75rem_1.5rem_-0.5rem_rgb(0_0_0/0.6),0_2.5rem_4rem_-1.5rem_rgb(0_0_0/0.5)]",
            )}
            holder={{
              name: null,
              username: "",
              image: null,
              country: "XX",
              bio: null,
            }}
            slots={{
              head: (
                <span className="min-w-0 truncate font-mono text-foreground/50">
                  <EmojiDomain path={address} />
                </span>
              ),
              country: <span />,
              photo: glyph && (
                // Half the frame, as the e-ID mark stands in it, solid: the
                // card's one picture, never a grey or a see-through one.
                <span className="grid size-full place-items-center text-foreground [&_svg]:size-1/2 [&_svg]:stroke-[1.5]">
                  {glyph}
                </span>
              ),
              name: (
                <h1 className="text-(length:--card-name) font-medium text-foreground/40 leading-[1.02] tracking-[-0.03em] [text-box:trim-start_cap_alphabetic]">
                  {name}
                </h1>
              ),
              flair: foot && (
                <span className="text-(length:--card-head) font-mono text-foreground/40">
                  {foot}
                </span>
              ),
            }}
          />
        </div>
      </HoloLean>
    </HoloLight>
  )
}

/** The page: the card (which says what happened), one line of what to do, and the
 *  way on. In the middle of whatever room the page has, a card's width wide. */
function Notice({
  card,
  children,
  actions,
}: {
  card: React.ReactNode
  children: React.ReactNode
  actions: React.ReactNode
}) {
  return (
    // The card at a profile card's size, everything under it on its centre line.
    <main className="mx-auto flex w-full max-w-xl flex-1 animate-fade-in flex-col items-center justify-center gap-10 px-5 py-12 motion-reduce:animate-none sm:px-8">
      <div className="w-full">{card}</div>
      <p className="text-balance text-center font-light text-foreground/60 text-lg leading-relaxed">
        {children}
      </p>
      <div className="flex flex-wrap justify-center gap-3">{actions}</div>
    </main>
  )
}

function Home({ primary }: { primary?: boolean }) {
  return (
    <Button
      variant={primary ? "default" : "secondary"}
      size="xl"
      icon={<House />}
      render={<Link href="/" />}
    >
      home
    </Button>
  )
}

/** The handle an address names, when it could be one: a single segment that is a
 *  valid username (lib/username-rules). `/favicon.ico`, `/a/b` and `/ab` are no
 *  one's address. */
function handleOf(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length !== 1) return null
  const handle = decodeURIComponent(segments[0]).toLowerCase()
  return usernameSchema.safeParse(handle).success ? handle : null
}

/** THE 404. At an address that could be someone's, the card for it, unissued, and
 *  the way to make it yours: the handle written on the home's blank card, taken up
 *  ready to claim (components/landing/hero-cards). A visitor who already holds a
 *  card is not offered a second. Anywhere else, the same card with nothing on it. */
export function Missing() {
  const pathname = usePathname()
  const handle = handleOf(pathname)
  // Nowhere a person could be: the card reads the address the site keeps for
  // it (lib/const, `forbiddenUsernames`), never a path half typed.
  if (!handle)
    return (
      <Notice
        card={
          <BlankCard address="/404" name="nothing here" glyph={<SearchX />} />
        }
        actions={<Home primary />}
      >
        check the link, or start from home.
      </Notice>
    )
  return <Unissued handle={handle} />
}

function Unissued({ handle }: { handle: string }) {
  const router = useRouter()
  const chip = useChip()
  const claim = () => {
    writeDraft({ handle })
    router.push("/")
  }
  // Unknown until the browser reads its cookie: the offer waits for it, so a
  // signed-in visitor never sees it flash.
  const canClaim = chip === null || (chip !== undefined && !chip.u)
  return (
    <Notice
      card={<BlankCard address={`/${handle}`} name="unissued" />}
      actions={
        canClaim ? (
          <>
            <Button size="xl" onClick={claim}>
              claim it
            </Button>
            <Home />
          </>
        ) : (
          <Home primary />
        )
      }
    >
      {canClaim
        ? "nobody holds this address. it can be yours."
        : "nobody holds this address."}
    </Notice>
  )
}

/** THE ERROR PAGE, inside the site's frame (app/error) or in a document of its own
 *  (app/global-error). The card of the page that broke, and its digest at the
 *  card's foot as a document number: the one thing to quote that matches the
 *  server's log. */
export function Broken({
  digest,
  retry,
}: {
  digest?: string
  retry: () => void
}) {
  return (
    <Notice
      card={
        // The address the site keeps for it (lib/const, `forbiddenUsernames`),
        // whatever page broke.
        <BlankCard
          address="/error"
          name="something broke"
          glyph={<Unplug />}
          foot={digest && <span className="select-all">ref {digest}</span>}
        />
      }
      actions={
        <>
          <Button size="xl" icon={<RotateCcw />} onClick={() => retry()}>
            try again
          </Button>
          <Home />
        </>
      }
    >
      it may be temporary. try again in a minute.
    </Notice>
  )
}
