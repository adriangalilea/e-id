"use client"

import { ArrowLeft, CornerDownLeft, Plus, RotateCcw, X } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  createContext,
  Suspense,
  use,
  useEffect,
  useRef,
  useState,
} from "react"
import { flushSync } from "react-dom"
import { BrandLogo } from "@/components/brand"
import {
  CountryOnCard,
  HandleOnCard,
  LINK_MARK,
  LINKS_ON_CARD,
  NameOnCard,
  PlatformChoice,
  useHandleState,
  WRITTEN_HERE,
} from "@/components/card-fields"
import { CORNER, ID1, ON_CARD } from "@/components/card-shape"
import { type Holder, IdCard } from "@/components/id-card"
import { SubjectLight } from "@/components/light"
import { PROFILE } from "@/components/profile-layout"
import { ProfileLinks } from "@/components/profile-links"
import { SIGN_IN_PROVIDERS } from "@/components/session/sign-in-providers"
import { useChip } from "@/components/session/use-chip"
import { SignInMenu } from "@/components/ui/account-menu"
import { Button } from "@/components/ui/button"
import { HoloLean, HoloLight } from "@/components/ui/holo"
import { InputGroup } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ShimmerLift } from "@/components/ui/shimmer"
import { toast } from "@/components/ui/toast"
import { useOnScreen } from "@/components/ui/use-on-screen"
import { claimDraft, githubCard, previewPresence } from "@/db/actions"
import {
  asLinks,
  type Draft,
  type DraftLink,
  fill,
  filledLinks,
  isBlank,
  toHandle,
} from "@/lib/card-draft"
import type { Card } from "@/lib/card-schema"
import { EMOJI_DOMAIN } from "@/lib/const"
import { clearDraft, readDraft, useDraft, writeDraft } from "@/lib/draft"
import type { HandoffProvider } from "@/lib/handoff"
import { prefixOf, usernameIn } from "@/lib/link-names"
import { getLinkIcon, getLinkPlaceholder } from "@/lib/links"
import { knownPlatform, type LinkPlatform, OFFERED } from "@/lib/platforms"
import type { Presence } from "@/lib/presence"
import { startSignIn } from "@/lib/sign-in"
import { cn } from "@/lib/utils"

/** The heading's letters as steel, by how they take light, two layers, top
 *  first:
 *  - its sheen: two streaks of light crossing the letters on a slant, slanted
 *    so it never cuts a letter in two the way a level band did;
 *  - its body: cool grey, near white at the top to dark steel at the foot,
 *    the contrast metal has and paint does not.
 *  No grain (level lines read as stripes printed on the letters, not as
 *  brushing), no outline, no hue. The steel is painted in the text's own box,
 *  so the box reaches below the line by a descender's depth (taken back
 *  outside, the line unmoved): set tight, a g's tail hung under it unpainted,
 *  invisible. */
const STEEL = cn(
  "-mb-[0.25em] bg-clip-text pb-[0.25em] text-transparent [-webkit-background-clip:text]",
  "bg-[linear-gradient(108deg,transparent_18%,rgb(255_255_255/0.75)_26%,transparent_34%,transparent_58%,rgb(255_255_255/0.45)_64%,transparent_71%),linear-gradient(180deg,#fdfdfe_0%,#cfd2d6_45%,#8a8e93_80%,#6e7277_100%)]",
)

/** Solid: a card hides what is behind it, as a real one does, so its glass
 *  blurs nothing behind it (id-card, `--id-card-backdrop`). */
const SOLID = "[--id-card-thickness:1] [--id-card-backdrop:none]"

/** A front card lies above every other: close under it a contact shadow, and a
 *  wider, softer one it casts on what lies under it, both the card's own (its
 *  box, its corner), so the shadow is the card's shape and moves with it. */
const FRONT = cn(
  SOLID,
  CORNER,
  "shadow-[0_0.75rem_1.5rem_-0.5rem_rgb(0_0_0/0.6),0_2.5rem_4rem_-1.5rem_rgb(0_0_0/0.5)]",
)

/** The light drifting across the visitor's card while no hand is on it: the
 *  spot it falls on (`--px`, which the card's hologram and foil rim read) swept
 *  slowly one way and back (globals.css, `holo-idle`), inside the lean, so the
 *  light moves and the card does not. The hand takes it over the moment it
 *  comes (HoloLight's own `--px`); under reduced motion it rests. */
const IDLE =
  "animate-[holo-idle_6s_ease-in-out_infinite_alternate] group-data-[hover]/holo:animate-none motion-reduce:animate-none"

/** Whether the visitor's card has started becoming a profile: a link on it says
 *  where, so there is a profile to show. The stage gives way to it then. */
function useForming(): boolean {
  const chip = useChip()
  const draft = useDraft()
  return !chip?.u && filledLinks(draft).length > 0
}

// ── the visitor's card ──────────────────────────────────────────────────────

/** THE VISITOR'S CARD, in the middle of the home: their own once they have one;
 *  until then a blank e-id they fill in where it lies, and filling it in IS making
 *  the profile. No form round it: the name on the name's line, the handle after
 *  the address (checked as it is typed), the country picked on its flag, the
 *  links added under them, each asking for the username there. The GitHub one
 *  fills the rest from GitHub (photo, name, country, website), and as links are
 *  added the page under the card becomes the profile they make (`Preview`). With
 *  a free handle the address offers to claim it; claiming signs in and the card
 *  becomes the account's (`Claim`). It lies still: a card being written on does
 *  not move. The page is the same for everyone, so whose it is is known only in
 *  the browser (`useChip`), blank until then. */
export function YourCard() {
  const chip = useChip()
  const draft = useDraft()
  const { writing, open, close } = useWriting()
  // Signed in with no address yet (their provider's handle was taken): the card
  // is taken up for them, to pick one.
  const unnamed = !!chip && !chip.u
  useEffect(() => {
    if (unnamed) open()
  }, [unnamed, open])
  return (
    // At rest its foil rim shows a band, not a faint whole ring, and the light
    // drifting across it (`IDLE`) moves that band: what draws the eye to the
    // card before the hand comes. Its print stays on the whole face outside the
    // band (@ag/holo's floor), so where the light has passed the card is still
    // printed, never a bare grey: much of it at rest, little under the hand,
    // where the print is lit four times stronger and a whole face of it was
    // loud; so it reads about as faint either way, the band alone standing out.
    // Waiting to be taken up, its rim catches the light passing over it at
    // full strength: the one card on the stage asking for the hand.
    <HoloLight
      className={cn(
        `relative w-full [--holo-floor:0.15] [&:not([data-hover])]:[--holo-floor:0.6] [&:not([data-hover])_[data-slot=foil-edge]]:[--edge-floor:0.12]`,
        writing
          ? "[&:not([data-hover])_[data-slot=foil-edge]]:opacity-25"
          : "[&:not([data-hover])_[data-slot=foil-edge]]:opacity-80",
      )}
    >
      <Claim />
      {chip?.u ? (
        <Suspense
          fallback={
            <IdCard
              heading="p"
              holo="laminate"
              className={FRONT}
              holder={{
                name: null,
                username: chip.u,
                image: chip.i,
                country: "XX",
                bio: null,
              }}
            />
          }
        >
          <HoloLean pose="flat" className="max-lg:[transform:none]">
            <div className={IDLE}>
              <OwnCard username={chip.u} />
            </div>
          </HoloLean>
        </Suspense>
      ) : (
        <>
          {/* Leaning to the hand as a profile's card does (user_profile), by
              no more than a few degrees: alive, and still to write on. Flat
              with no hand on it. */}
          <HoloLean
            pose="flat"
            className="[transform:none] group-data-[hover]/holo:[transform:var(--holo-lean)] max-lg:group-data-[hover]/holo:[transform:none]"
          >
            <div inert={!writing} className={IDLE}>
              <FillCard />
            </div>
          </HoloLean>
          {!writing && (
            // While it waits by the stack the whole card is one press: taking
            // it up, not writing on it yet.
            <button
              type="button"
              aria-label="make your card"
              onClick={open}
              className={cn(CORNER, "absolute inset-0 z-10 cursor-pointer")}
            />
          )}
          {/* Under the card, outside its box: the card is placed by its own
              middle, never moved by what shows under it. */}
          <div
            className={cn(
              `absolute inset-x-0 top-full mt-4 flex items-center justify-end gap-4 transition-opacity`,
              !writing && "opacity-0",
            )}
          >
            {unnamed && (
              <p className="mr-auto text-foreground/60 text-sm">
                {"you're signed in. pick your address to finish."}
              </p>
            )}
            {!isBlank(draft) && (
              // The page's own button (@ag/button, in its glass): read over any
              // card that lies under it, named by its glyph and its words.
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  shape(false, () => {
                    clearDraft()
                    close()
                  })
                }
                icon={<RotateCcw />}
                className="animate-fade-in motion-reduce:animate-none"
              >
                start over
              </Button>
            )}
          </div>
        </>
      )}
    </HoloLight>
  )
}

function FillCard() {
  const draft = useDraft()
  const handle = useHandleState(draft.handle)
  // A blank card taken up comes with the caret on its name, blinking, so the
  // first thing it does is ask to be written on. Where there is a fine pointer
  // only: on a phone it would raise the keyboard over the page unasked.
  const { writing } = useWriting()
  const name = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (
      writing &&
      isBlank(readDraft()) &&
      matchMedia("(pointer: fine)").matches
    )
      name.current?.focus({ preventScroll: true })
  }, [writing])
  useGithubFill(
    draft.links.find((l) => l.platform === "github")?.value.trim() || null,
  )
  // Signed out, claiming asks which way in, signs in, and `Claim` finishes on
  // the way back; signed in with no address yet, `Claim` finishes now.
  const chip = useChip()
  const claim = () => writeDraft({ claiming: true })
  const signInToClaim = (provider: HandoffProvider) => {
    claim()
    return startSignIn(provider)
  }
  return (
    <IdCard
      heading="p"
      holo="laminate"
      className={FRONT}
      holder={{
        name: draft.name,
        username: draft.handle || "you",
        image: draft.image,
        country: draft.country,
        bio: null,
      }}
      slots={{
        name: (
          <NameOnCard
            ref={name}
            label="your name"
            value={draft.name}
            onChange={(written) => writeDraft({ name: written })}
          />
        ),
        // The address heads the card, where its mark and "e-id" stand on a
        // finished one: it is what the card is for, written first.
        head: (
          <Address
            draft={draft}
            handle={handle}
            claim={
              chip
                ? { signedIn: true, onClaim: claim }
                : { signedIn: false, onSignIn: signInToClaim }
            }
          />
        ),
        country: (
          <CountryOnCard
            label="your country"
            code={draft.country}
            onChange={(code) => writeDraft({ country: code })}
          />
        ),
        flair: <Links links={draft.links} />,
      }}
    />
  )
}

/** The card fills itself from the visitor's GitHub once they give it (their
 *  GitHub link): photo, name, handle, country, website, each only where they
 *  wrote nothing (lib/draft, `fill`). Another login replaces that fill; none, or
 *  one GitHub does not know, takes it back off. */
function useGithubFill(login: string | null) {
  useEffect(() => {
    const now = readDraft()
    if (!login) {
      if (now.auto) writeDraft(fill(now, null))
      return
    }
    if (now.auto?.login.toLowerCase() === login.toLowerCase()) return
    let live = true
    const wait = setTimeout(() => {
      void githubCard(login).then((found) => {
        if (!live) return
        writeDraft(
          fill(
            readDraft(),
            found && {
              login: found.login,
              name: found.name,
              handle: toHandle(found.login),
              country: found.country,
              image: found.image,
              links: found.website
                ? [{ platform: "website", value: found.website }]
                : [],
            },
          ),
        )
      })
    }, 300)
    return () => {
      live = false
      clearTimeout(wait)
    }
  }, [login])
}

/** The address as the card writes it, the handle typed after its slash, as wide
 *  as what is typed (a monospace field is that many characters). After it, what
 *  the handle is: faint while it is no username yet, "taken", or free, and then
 *  the way to claim it, there in the line (Enter does the same). Signed in, the
 *  press claims it; signed out, it opens the ways in first (@ag/account-menu's
 *  SignInMenu), Enter too, and the claim finishes on the way back. */
function Address({
  draft,
  handle,
  claim,
}: {
  draft: Draft
  handle: ReturnType<typeof useHandleState>
  claim:
    | { signedIn: true; onClaim: () => void }
    | {
        signedIn: false
        onSignIn: (provider: HandoffProvider) => Promise<void>
      }
}) {
  const free = handle?.state === "free"
  const claimButton = useRef<HTMLButtonElement>(null)
  const enter = claim.signedIn
    ? claim.onClaim
    : () => claimButton.current?.click()
  // Wrong while it cannot be theirs: taken, or no username at all yet (too
  // short, forbidden); the field's rim says so (@ag/input, `aria-invalid`).
  const wrong =
    draft.handle !== "" &&
    (handle?.state === "taken" || handle?.state === "invalid")
  return (
    // The field holds the address alone; what the address is (taken, or free and
    // the way to claim it) stands after it, on the same line, at its height.
    <div className="flex min-w-0 items-center gap-[0.5em] font-mono text-[3.2cqw]">
      <HandleOnCard
        label="your username"
        describedBy="handle-state"
        invalid={wrong}
        value={draft.handle}
        onChange={(handle) => writeDraft({ handle })}
        onEnter={free ? enter : undefined}
      />
      <span id="handle-state" aria-live="polite" className="shrink-0">
        {free ? (
          claim.signedIn ? (
            <ClaimButton onClick={claim.onClaim} />
          ) : (
            <SignInMenu
              providers={SIGN_IN_PROVIDERS}
              onSignIn={claim.onSignIn}
              reason="sign in to claim it"
              trigger={<ClaimButton ref={claimButton} />}
            />
          )
        ) : handle?.state === "taken" ? (
          <span className="text-foreground/50">taken</span>
        ) : wrong ? (
          <span className="sr-only">{handle?.why}</span>
        ) : null}
      </span>
    </div>
  )
}

/** The press that claims the address, in the card's line, at its type size. */
function ClaimButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      material="plain"
      variant="secondary"
      {...props}
      className={cn(ON_CARD, "h-[1.5em] px-[0.5em] text-[1em]")}
    >
      claim ↵
    </Button>
  )
}

/** The card's links (id-card, `Flair`): each a press that opens it to change or
 *  take off, and "+" to add one, in a popover (@ag/popover): the platforms on
 *  offer by name (lib/platforms, `OFFERED`), then the username there. */
function Links({ links }: { links: DraftLink[] }) {
  const rest = OFFERED.filter((p) => !links.some((l) => l.platform === p))
  const mark = LINK_MARK
  const save = (platform: LinkPlatform, value: string) => {
    const others = readDraft().links.filter((l) => l.platform !== platform)
    const next = value ? [...others, { platform, value }] : others
    shape(
      next.some((l) => l.value.trim() !== ""),
      () => writeDraft({ links: next }),
    )
  }
  return (
    <fieldset aria-label="links" className={LINKS_ON_CARD}>
      {links.map((link) => (
        <LinkPopover
          key={link.platform}
          trigger={
            <button
              type="button"
              aria-label={`${link.platform}: ${link.value}`}
              className={mark}
            >
              {getLinkIcon(link.platform)}
            </button>
          }
          platforms={[link.platform]}
          link={link}
          onSave={save}
        />
      ))}
      {rest.length > 0 && (
        <LinkPopover
          trigger={
            <button
              type="button"
              aria-label="add a link"
              // A mark like the links beside it, a step dimmer: one more to add.
              className={cn(mark, "text-foreground/55")}
            >
              <Plus />
            </button>
          }
          platforms={rest}
          onSave={save}
        />
      )}
    </fieldset>
  )
}

/** One link's popover: with several platforms to choose from, the list first
 *  (icon and name); then the field for the username there, the platform's
 *  address before it, Enter to keep. A link already on the card opens straight
 *  to its field, with the way to take it off. */
function LinkPopover({
  trigger,
  platforms,
  link,
  onSave,
}: {
  trigger: React.ReactElement
  platforms: readonly LinkPlatform[]
  link?: DraftLink
  onSave: (platform: LinkPlatform, value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState<LinkPlatform | null>(
    link?.platform ?? (platforms.length === 1 ? (platforms[0] ?? null) : null),
  )
  const [typed, setTyped] = useState(link?.value ?? "")
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setChosen(
            link?.platform ??
              (platforms.length === 1 ? (platforms[0] ?? null) : null),
          )
          setTyped(link?.value ?? "")
        }
      }}
    >
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-80 gap-3 p-3">
        {!chosen ? (
          <PlatformChoice platforms={platforms} onPick={setChosen} />
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              onSave(chosen, usernameIn(chosen, typed))
              setOpen(false)
            }}
          >
            {/* The link named, and at its other end the one thing to do with
                it besides writing: back to the list while adding, × to take it
                off the card once it is on it. */}
            <div className="flex h-7 items-center gap-2 pl-1 text-foreground/85 text-sm [&_svg]:stroke-[1.5]">
              {!link && platforms.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="other platforms"
                  onClick={() => setChosen(null)}
                  className="-ml-1.5 text-foreground/50"
                >
                  <ArrowLeft />
                </Button>
              )}
              <span className="[&_svg]:size-4">{getLinkIcon(chosen)}</span>
              {chosen}
              {link && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`remove ${chosen}`}
                  onClick={() => {
                    onSave(link.platform, "")
                    setOpen(false)
                  }}
                  className="ml-auto text-foreground/50"
                >
                  <X />
                </Button>
              )}
            </div>
            <InputGroup
              size="sm"
              autoFocus
              aria-label={`your ${chosen}`}
              placeholder={getLinkPlaceholder(chosen)}
              {...WRITTEN_HERE}
              spellCheck={false}
              autoCapitalize="none"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              // The platform's address the username continues, in the same
              // type: "github.com/adriangalilea", one address.
              prefix={prefixOf(chosen) || undefined}
              end={<CornerDownLeft className="text-foreground/40" />}
            />
          </form>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** The card becomes the account's: when the sign-in the address started comes
 *  back signed in, what was written is claimed (`claimDraft`) and the profile it
 *  made opens. Claiming until the server answers, so a lost call is tried again
 *  on the next load; sent once per mount (`sent`), so a second render never
 *  claims twice. A drafted handle refused (taken, invalid) is said; with no
 *  address to open, the card stays up to pick another. */
function Claim() {
  const chip = useChip()
  const draft = useDraft()
  const router = useRouter()
  const sent = useRef(false)
  useEffect(() => {
    if (!chip || !draft.claiming || sent.current) return
    sent.current = true
    const { name, handle, country, links } = draft
    const written = { name, handle, country, links }
    claimDraft(written).then(
      ({ username, stale, refused }) => {
        if (refused)
          toast.error(`${EMOJI_DOMAIN}/${written.handle}`, {
            description: refused,
          })
        if (!username) {
          sent.current = false
          return writeDraft({ claiming: false })
        }
        clearDraft()
        if (!stale) router.push(`/${username}`)
      },
      // Still claiming: the next load tries again.
      (error) => {
        sent.current = false
        throw error
      },
    )
  }, [chip, draft, router])
  return null
}

/** Each person's card read once per page (`/<username>/card.json`), kept so a
 *  render suspends on the same promise. */
const cards = new Map<string, Promise<Holder>>()

function cardHolder(username: string): Promise<Holder> {
  let holder = cards.get(username)
  if (!holder) {
    holder = fetch(`/${username}/card.json`)
      .then((response) => {
        if (!response.ok)
          throw new Error(`card of ${username}: HTTP ${response.status}`)
        return response.json() as Promise<Card>
      })
      .then((card) => ({
        name: card.name,
        username: card.handle,
        image: card.photo,
        country: card.country ?? "XX",
        bio: card.bio,
        // The card's own links; their profile (the data's short form) is the
        // embed's, the card drawn here shows none.
        links: card.links.map((link) => ({
          platform: knownPlatform(link.platform),
          name: link.name,
          url: link.url,
        })),
      }))
    cards.set(username, holder)
  }
  return holder
}

function OwnCard({ username }: { username: string }) {
  return (
    <IdCard
      heading="p"
      holo="laminate"
      className={FRONT}
      holder={use(cardHolder(username))}
    />
  )
}

// ── the profile it becomes ──────────────────────────────────────────────────

/** THE PROFILE THE CARD MAKES, under it: once a link on the card says where, the
 *  page shows what the profile will (the same `ProfileLinks` a profile draws,
 *  its GitHub calendar, its website's preview), read from those links as they
 *  are written (`previewPresence`), each answer faded in as it comes. Before an
 *  account exists, built in the browser and nowhere else. */
export function Preview() {
  const forming = useForming()
  const draft = useDraft()
  const key = JSON.stringify(filledLinks(draft))
  const [read, setRead] = useState<{ key: string; presence: Presence } | null>(
    null,
  )
  useEffect(() => {
    if (!forming) return
    let live = true
    const wait = setTimeout(() => {
      void previewPresence(JSON.parse(key)).then((presence) => {
        if (live) setRead({ key, presence })
      })
    }, 400)
    return () => {
      live = false
      clearTimeout(wait)
    }
  }, [forming, key])
  if (!forming || !read) return null
  return (
    <div
      key={read.key}
      className="w-full animate-fade-in motion-reduce:animate-none"
    >
      <ProfileLinks
        links={asLinks(JSON.parse(read.key))}
        presence={read.presence}
      />
    </div>
  )
}

// ── the stage ───────────────────────────────────────────────────────────────

/** Whether the visitor's card has been taken up to be written on, and the two
 *  ways it changes: taken up from where it waits by the stack, put back on
 *  starting over. Held by the stage, which lays the cards out by it. */
const Writing = createContext<{
  writing: boolean
  open: () => void
  close: () => void
} | null>(null)

function useWriting() {
  const writing = use(Writing)
  if (!writing) throw new Error("the visitor's card is drawn outside Stage")
  return writing
}

/** How many cards lie under the pile's top one, each with how long its slow
 *  drift takes (globals.css, `card-float`), no two in step. */
const UNDER = [9, 11, 10, 12, 9.5, 10.5, 11.5, 8.5] as const

/** Where the pile's far end lies, in the top card's widths across and heights
 *  up or down from its middle: the layout Adrian chose, fixed. The pile is
 *  composed on its own and never follows the visitor's card or the heading:
 *  moving either once reshuffled every card behind them. */
const PILE_END = { x: -1.388, y: -0.606 }

/** The funnel the cards are carried along, lying on its side as a tornado
 *  blown over: its axis from the top card's middle to its far end
 *  (`PILE_END`). Round that axis the cards swing (`TURN`, degrees a card), wide
 *  at the top card (`MOUTH`, the swing in the top card's heights either side
 *  of the axis) and narrowing to nothing at the tip, each card a step further
 *  along it, the steps lengthening a little as it goes (`ALONG`). */
function end() {
  return PILE_END
}
const MOUTH = 1
const TURN = 130
const ALONG = 0.85

/** Where the funnel's mouth is, as a share of the way from the top card to the
 *  tip: below nothing, so past the top card's right side, the mouth behind it
 *  and the spread round it on both sides. */
const BEHIND = -0.3

/** What keeps the funnel from being drawn with a ruler: each card a little off
 *  its spot on it, along (the top card's widths), across (its heights), and
 *  in its turn (degrees). Fixed, so the page is the same on every load. */
const WOBBLE = [
  { along: 0.03, across: 0.04, turn: 2 },
  { along: -0.02, across: -0.05, turn: -3 },
  { along: 0.04, across: 0.03, turn: 2 },
  { along: -0.03, across: -0.04, turn: 3 },
  { along: 0.02, across: 0.05, turn: -2 },
  { along: -0.04, across: -0.03, turn: 3 },
  { along: 0.03, across: 0.02, turn: -3 },
  { along: 0, across: 0, turn: 1 },
] as const

/** One card's width under the top, a share of the top card's: smaller with
 *  depth, as it is further away. */
function widthAt(depth: number) {
  return 0.78 - 0.05 * depth
}

/** A card under the top, in the funnel: its middle from the top card's, as
 *  shares of the top card's width and height, and its turn, in degrees, leaning
 *  as it swings, less as the funnel narrows. */
function funneled(depth: number) {
  const wobble = WOBBLE[depth - 1] as (typeof WOBBLE)[number]
  const tip = end()
  const t = (depth / UNDER.length) ** ALONG + wobble.along
  // Its axis starts past the top card's right side (`BEHIND`), so the wide
  // mouth lies behind the top card, and runs left to the tip.
  const along = BEHIND + (1 - BEHIND) * t
  // The nearest swings up first, the next down, and so on round.
  const swing = (TURN * depth - 220) * (Math.PI / 180)
  const wide = MOUTH * (1 - t)
  return {
    dx: tip.x * along * 100,
    dy: (tip.y * along + wide * Math.sin(swing) + wobble.across) * 100,
    r: -9 * Math.cos(swing) * (1 - t) + wobble.turn,
  }
}

/** The pile's room, in the top card's widths from its middle (both ways): from
 *  the visitor's card's middle to just past the top card's right side, from
 *  under the bar to a little under the top card's foot. */
const ROOM = { left: -0.05, right: 0.45, top: -0.85, bottom: 0.3 }

/** How much more room what holds still claims than one card under the top: the
 *  top card the most, the visitor's card's room less. */
const CLAIM = { top: 0.2, visitor: 0.08 }

/** How much further up the cards above the top card lie than where they
 *  settle: the pile reaching toward the window's top. */
const UPWARD = 1.25

/** The cards' spots: the room shared out evenly among them, each card at the
 *  middle of its own share (a centroidal Voronoi tessellation, by Lloyd's
 *  relaxation over a grid of the room), the top card and the visitor's card's
 *  room at the pile's far end holding still and claiming more (`CLAIM`).
 *  Distances are in card shapes (heights
 *  scaled to widths), so each share is a card's shape, not a square: no card
 *  bunched on another, no part of the room left bare. Then the nearest to the
 *  top card is the nearest in depth, and so on out. Once, on first use (the
 *  slots it reads are defined below it). */
let settledSpots: { dx: number; dy: number; r: number }[] | null = null

function settled() {
  if (settledSpots) return settledSpots
  const ratio = 85.6 / 53.98
  const tip = end()
  // Card shapes: across in the top card's widths, down in its heights.
  const still = [
    { u: 0, v: 0, claim: CLAIM.top },
    { u: tip.x, v: tip.y, claim: CLAIM.visitor },
  ]
  const left = tip.x + ROOM.left
  const right = ROOM.right
  const top = ROOM.top * ratio
  const bottom = ROOM.bottom * ratio
  const free = UNDER.map((_, i) => {
    const { dx, dy } = funneled(i + 1)
    return {
      u: Math.min(right, Math.max(left, dx / 100)),
      v: Math.min(bottom, Math.max(top, dy / 100)),
    }
  })
  const samples: { u: number; v: number }[] = []
  for (let i = 0; i < 90; i++)
    for (let j = 0; j < 60; j++)
      samples.push({
        u: left + ((right - left) * (i + 0.5)) / 90,
        v: top + ((bottom - top) * (j + 0.5)) / 60,
      })
  for (let round = 0; round < 80; round++) {
    const sums = free.map(() => ({ u: 0, v: 0, n: 0 }))
    for (const sample of samples) {
      let nearest = -1
      let best = Number.POSITIVE_INFINITY
      for (const [i, card] of still.entries()) {
        const d =
          (sample.u - card.u) ** 2 + (sample.v - card.v) ** 2 - card.claim
        if (d < best) {
          best = d
          nearest = -1 - i
        }
      }
      for (const [i, card] of free.entries()) {
        const d = (sample.u - card.u) ** 2 + (sample.v - card.v) ** 2
        if (d < best) {
          best = d
          nearest = i
        }
      }
      if (nearest < 0) continue
      const sum = sums[nearest] as (typeof sums)[number]
      sum.u += sample.u
      sum.v += sample.v
      sum.n += 1
    }
    for (const [i, card] of free.entries()) {
      const sum = sums[i] as (typeof sums)[number]
      if (sum.n === 0) continue
      card.u = sum.u / sum.n
      card.v = sum.v / sum.n
    }
  }
  settledSpots = free
    .toSorted((a, b) => Math.hypot(a.u, a.v) - Math.hypot(b.u, b.v))
    .map((card, i) => ({
      dx: card.u * 100,
      // The grouping as settled, stretched upward toward the window's top (the
      // cards above the top card a quarter further up), never further down.
      dy: card.v * (card.v < 0 ? UPWARD : 1) * 100,
      r: (WOBBLE[i] as (typeof WOBBLE)[number]).turn * 1.5,
    }))
  return settledSpots
}

/** One card under the top: as deep as it lies in the pile (`depth`, 1 the
 *  nearest), and everything about it goes with that depth, a step at a time, so
 *  the nearest are still read and the deepest only seen: smaller by its own
 *  width (painted at the size it is seen, never a shrunk picture), faded into
 *  the page (a scrim of the page's own ground over it, `--fade`: never darker
 *  than the ground it fades onto, as dimming made it, and never see-through,
 *  which showed the shimmer through it), and out of focus the way a lens sets
 *  what lies behind its subject, plainly from the first card under the top
 *  (4px; the top card itself 3.2px) to the deepest (11px). Each drifts on its
 *  own
 *  (globals.css, `card-float`). */
function under(depth: number, float: number) {
  const { dx, dy, r } = settled()[depth - 1] as ReturnType<
    typeof settled
  >[number]
  return {
    "--lw": `${(widthAt(depth) * 100).toFixed(1)}%`,
    "--dx": `${dx.toFixed(2)}%`,
    "--dy": `${dy.toFixed(2)}%`,
    "--r": `${r.toFixed(2)}deg`,
    "--fade": (0.45 + 0.07 * (depth - 1)).toFixed(2),
    "--bl": `${(4 + 1 * (depth - 1)).toFixed(2)}px`,
    animationDuration: `${float}s`,
    animationDelay: `-${(float * depth) / UNDER.length}s`,
  } as React.CSSProperties
}

/** A card of the pile under the hand, every one alike, the top one too: it comes
 *  toward the reader (nearer in depth, never up the page, so it never rises over
 *  a card lying above it) and tilts toward the hand, its near edge going down
 *  where the hand presses (±9° across, ±7° up and down), its shadow longer as
 *  it comes off the table. Eased both ways, so it follows with a little weight
 *  and settles back flat. Worn by a `ShimmerLift` (@ag/shimmer): the shimmer
 *  parts round the card as it rises, following it. */
const PICKED =
  "relative transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:shadow-[0_2rem_3.5rem_-0.75rem_rgb(0_0_0/0.7)] group-hover/card:[transform:perspective(1200px)_translateZ(2rem)_rotateY(calc((var(--px,0.5)-0.5)*18deg))_rotateX(calc((var(--py,0.5)-0.5)*-14deg))] motion-reduce:transition-none motion-reduce:group-hover/card:[transform:none]"

/** Real e-id cards in one pile, the maker's on top and then the newest whole ones
 *  (a photo, a name, a country): the top one flat on the table as the rest are,
 *  the rest under it, all of them under the hero's shimmer (components/light,
 *  z-[5]), only the visitor's card over it. Each card answers the hand alone,
 *  with a light of its own: a hand on one moves nothing else, and parts the
 *  shimmer round it (`PICKED`). `away`, the pile set back while
 *  the visitor writes. What a card is, shown whole. */
function Pile({ people, away }: { people: Holder[]; away: boolean }) {
  const [top, ...rest] = people
  if (!top) throw new Error("the home's pile has nobody to show")
  return (
    // The top card's shape kept before it is drawn: the cards under it are
    // placed by shares of its box, and the page is painted while its HTML is
    // still arriving, the top card's after theirs. Left to the card, the box
    // had no height in that first paint and every card jumped from the middle.
    <div className={cn(ID1, "relative w-full")}>
      {rest
        .map((holder, i) => ({ holder, depth: i + 1 }))
        .reverse()
        .map(({ holder, depth }) => (
          <div
            key={holder.username}
            // Its middle placed from the top card's by left and top (shares of
            // the top card's box). Under the hand it comes out of its fade, in
            // focus, but keeps its depth in the pile: never over a card that
            // lies above it. On one column the top card stands alone: there is
            // no room round it to spread into.
            className="group/card absolute top-[calc(50%+var(--dy))] left-[calc(50%+var(--dx))] z-0 w-(--lw) animate-[card-float_ease-in-out_infinite_alternate] blur-(--bl) [transform:translate(-50%,-50%)_rotate(var(--r))] [transition:filter_1s_cubic-bezier(0.22,1,0.36,1)] hover:blur-none motion-reduce:animate-none motion-reduce:transition-none max-lg:hidden"
            style={under(depth, UNDER[depth - 1] as number)}
          >
            {/* Its own light, so it alone tilts toward the hand on it, its
                near edge going down where the hand presses (±9° across, ±7° up
                and down), lifted a little; flat again when the hand leaves. */}
            <HoloLight>
              <ShimmerLift className={cn(CORNER, PICKED)}>
                <IdCard
                  holder={holder}
                  heading="p"
                  holo="laminate"
                  className={SOLID}
                />
                <div
                  aria-hidden
                  className={cn(
                    CORNER,
                    `pointer-events-none absolute inset-0 bg-background opacity-(--fade) transition-opacity duration-1000 group-hover/card:opacity-0`,
                  )}
                />
              </ShimmerLift>
            </HoloLight>
          </div>
        ))}
      {/* Drifting as the cards under it do (globals.css, `card-float`), on its
          own time, so the pile moves as one loose thing. Under the shimmer
          with the rest of the pile (z-0 below its z-[5]): only the visitor's
          card stands over it. */}
      <div className="relative z-0 animate-[card-float_10s_ease-in-out_infinite_alternate] [animation-delay:-3s] motion-reduce:animate-none">
        {/* Its light, carried with it. */}
        {!away && <SubjectLight />}
        {/* Dropped on the table a little askew, as the rest lie, never square
            to the page. Out of focus a little, the nearest of the pile but
            still of it; under the hand, sharp, and it answers as every card of
            the pile does (`PICKED`), with a light of its own. */}
        <div className="[transform:rotate(3deg)]">
          <HoloLight>
            <div className="group/card blur-[3.2px] transition-[filter] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] hover:blur-none motion-reduce:transition-none">
              <ShimmerLift className={cn(CORNER, PICKED)}>
                <IdCard
                  holder={top}
                  heading="p"
                  holo="laminate"
                  className={FRONT}
                />
                {/* Faded into the page a little, as the cards under it are
                    more; clear under the hand. */}
                <div
                  aria-hidden
                  className={cn(
                    CORNER,
                    `pointer-events-none absolute inset-0 bg-background opacity-30 transition-opacity duration-1000 group-hover/card:opacity-0`,
                  )}
                />
              </ShimmerLift>
            </div>
          </HoloLight>
        </div>
      </div>
    </div>
  )
}

/** A spot on the stage: its centre across in % of the stage's width and up or
 *  down in rem from the stage's centre, its width in rem, its turn on the table
 *  in degrees. */
type Slot = { x: number; y: number; w: number; rz: number }

/** The middle: the pile's top card at rest, right of centre, the pile spread
 *  from it leftward toward the visitor's card (`UNDER`), so the two stand
 *  centred as one group; the visitor's card once taken up. */
const MIDDLE = { x: 34, y: 9, w: 34, rz: 0 } as const

/** Where the visitor's blank card waits: on the left where the eye starts, a
 *  little above the pile's middle, lying over the pile's deepest cards (they are
 *  under the shimmer, it over), so it reads as the nearest card on the table.
 *  Taken up, the pile goes to lie where it lay: the two trade spots. */
const WAITING = { x: -32, y: 2, w: 33, rz: 0 } as const

/** Where the pile goes once the visitor's card is taken up: pushed back from
 *  the middle the visitor's card grows into, further right and a little down,
 *  smaller as further away. */
const PUSHED = { x: MIDDLE.x + 12, y: MIDDLE.y + 3, w: 26, rz: 0 } as const

/** How near the window's left edge a card may lie: the page's gutter on a wide
 *  screen (components/frame, `GUTTER`). */
const EDGE = 2

/** A slot as the variables a card is laid out by (`PLACED`, `PILED`). Its middle
 *  is a share of the stage from the stage's middle, but its width is the card's
 *  own, so on the left it overhangs the stage into the window's margin (the
 *  room outside the stage: the hero's width, `100cqw`, less the stage's,
 *  `100%`, halved). Where that margin runs out, the card is moved right just
 *  enough to stay inside the window, and the heading over it with it. */
function at({ x, y, w, rz }: Slot): React.CSSProperties {
  return {
    "--w": `${w}rem`,
    "--l": `max(calc(50% + ${x}%), calc(${w / 2 + EDGE}rem - (100cqw - 100%) / 2))`,
    "--t": `calc(50% + ${y}rem)`,
    "--rz": `${rz}deg`,
  } as React.CSSProperties
}

/** One easing for every card changing spot on the stage: slow, settling at the
 *  end, as a card slid across a table. */
const SLIDE =
  "duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"

/** The visitor's card, laid out by its slot on a wide screen: placed by left and
 *  top in the stage, by its centre, turned on the table. On one column, in the
 *  page's flow. */
const PLACED = cn(
  "lg:absolute lg:top-(--t) lg:left-(--l) lg:w-(--w) lg:[transform:translate(-50%,-50%)_rotate(var(--rz))]",
  "transition-[left,top,width,transform]",
  SLIDE,
)

/** The pile, laid out by its slot without a transform (its left and top taken
 *  back by half its size, a card being 1.586 times as wide as tall): a transform
 *  would make the pile one layer and leave the shimmer nothing to lie between
 *  its top card and the rest (`Pile`). */
const PILED = cn(
  "lg:absolute lg:top-[calc(var(--t)-var(--w)/3.172)] lg:left-[calc(var(--l)-var(--w)/2)] lg:w-(--w)",
  "transition-[left,top,width,filter]",
  SLIDE,
)

/** THE HERO'S STAGE: real cards in one pile in the middle (`Pile`), the top one
 *  whole and in the light, the rest spread down under the shimmer; apart from
 *  it, the visitor's own, blank and in focus, the light passing over it (`IDLE`)
 *  drawing the eye (`WAITING`). Taken up, it and the pile trade spots: it slides
 *  to the middle at its full size to be written on, the pile, smaller, to where
 *  it waited, all of it under the shimmer. Once it starts becoming a profile the
 *  stage IS the profile page's layout (the golden split,
 *  app/[username]/user_profile): the card held in the left column, the links
 *  it makes on the right (`Preview`), the pile gone. The card moves there as one
 *  thing (a view transition, `shape`), never a jump. A visitor with an account
 *  has their own card in the middle from the start. Under reduced motion nothing
 *  moves. On one column, the pile, then their card under it. */
export function Stage({
  people,
  preview,
  children,
}: {
  people: Holder[]
  /** the profile the card makes, beside it once it forms */
  preview: React.ReactNode
  /** what the visitor holds: their card */
  children: React.ReactNode
}) {
  const own = useChip()?.u
  const draft = useDraft()
  const forming = useForming()
  const [asked, setAsked] = useState(false)
  const writing = Boolean(own) || asked || !isBlank(draft)
  // Taken up and still blank, it goes back where it waited on Esc or a press
  // anywhere off it: nothing written is ever put down. A popup open on it (the
  // country picker, a link) takes its own Esc and presses first.
  const yours = useRef<HTMLDivElement>(null)
  // Scrolled past, or the tab hidden, its drifts and lights hold where they
  // are: blurred cards moving cost the GPU every frame, and nobody sees them.
  const [stage, setStage] = useState<HTMLDivElement | null>(null)
  const seen = useOnScreen(stage)
  const putBack = asked && !own && isBlank(draft)
  useEffect(() => {
    if (!putBack) return
    const popupOpen = () => document.querySelector("[data-popup-open]")
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !popupOpen()) setAsked(false)
    }
    const press = (e: PointerEvent) => {
      const target = e.target as Element
      if (popupOpen() || target.closest("[data-side]")) return
      if (!yours.current?.contains(target)) setAsked(false)
    }
    // Captured, so a popup is still open when it is asked about: its own Esc
    // closes it after.
    document.addEventListener("keydown", key, true)
    document.addEventListener("pointerdown", press, true)
    return () => {
      document.removeEventListener("keydown", key, true)
      document.removeEventListener("pointerdown", press, true)
    }
  }, [putBack])
  const pile = people
    .filter((holder) => holder.username !== own)
    .slice(0, UNDER.length + 1)
  return (
    <Writing
      value={{
        writing,
        open: () => setAsked(true),
        close: () => setAsked(false),
      }}
    >
      <div
        ref={setStage}
        // Said on the stage, for what lies round it to step back with the pile
        // while the visitor writes (components/light, `HeroShimmer`).
        data-writing={writing && !forming ? "" : undefined}
        className={cn(
          "relative w-full",
          !seen && "[&_*]:[animation-play-state:paused]",
          forming
            ? cn(PROFILE.grid, PROFILE.frame)
            : `flex flex-col items-center gap-12 py-16 sm:py-20 lg:block lg:h-[50rem] lg:py-0`,
        )}
      >
        {/* The page's heading over the card waiting under it, flush with its
            left edge: the name, and under it what it is. It gives way while the
            visitor writes, and is only read aloud once the card is a profile. */}
        <div
          className={cn(
            `pointer-events-none flex flex-col gap-[0.9rem] transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] max-lg:items-center lg:absolute lg:bottom-[calc(100%-var(--t)+var(--w)/3.172+3.5rem)] lg:left-[calc(var(--l)-var(--w)/2)] lg:z-20 lg:w-max`,
            forming ? "sr-only" : writing && "opacity-0",
          )}
          style={at(WAITING)}
        >
          <h1 className="flex items-center gap-[0.3em] font-normal text-[clamp(2.75rem,5vw,4.75rem)] leading-none tracking-[-0.035em]">
            {/* The logo before the name, as the bar draws it. A little taller
                than its capitals. */}
            <BrandLogo className="size-[0.95em]" />
            <span className={STEEL}>e-ID</span>
          </h1>
          <p className="font-light text-[clamp(1.125rem,1.6vw,1.5rem)] text-foreground/60 leading-snug tracking-[-0.01em]">
            your digital identity
          </p>
        </div>
        {!forming && (
          // In the middle at rest; once the visitor's card is taken up and
          // grows into the middle, pushed back where it lay (`PUSHED`), smaller
          // and well out of focus, every card of it (a filter, which makes the
          // pile one layer, all of it under the shimmer then).
          <div
            inert={writing}
            className={cn(
              PILED,
              "relative w-full max-w-[34rem] lg:max-w-none",
              writing && "max-lg:hidden lg:blur-[3px]",
            )}
            style={at(writing ? PUSHED : MIDDLE)}
          >
            <Pile people={pile} away={writing} />
          </div>
        )}
        {/* One element in every layout, so the card is never remounted; named,
            so the view transition carries it from the middle to its column, the
            profile's held pane (components/profile-layout). */}
        <div
          ref={yours}
          className={cn(
            "relative w-full [view-transition-name:your-card]",
            forming
              ? cn(
                  PROFILE.identity,
                  "z-10 lg:sticky lg:top-20 lg:self-start lg:[grid-area:side]",
                )
              : cn(PLACED, "z-10 max-w-[42rem] lg:max-w-none"),
          )}
          style={
            forming
              ? undefined
              : at(writing ? { x: 0, y: 0, w: 42, rz: 0 } : WAITING)
          }
        >
          {/* Its light, carried with it wherever it lies. */}
          {!forming && <SubjectLight />}
          {/* Waiting, it drifts, slowly (globals.css, `card-float`): alive
              where it lies, still once it is being written on. */}
          <div
            className={cn(
              !forming &&
                !writing &&
                `animate-[card-float_10s_ease-in-out_infinite_alternate] motion-reduce:animate-none`,
            )}
          >
            {children}
          </div>
        </div>
        {forming && (
          // Over the hero's shimmer, as the card is: it is the page's subject.
          <main className={cn(PROFILE.links, "relative z-10")}>{preview}</main>
        )}
      </div>
    </Writing>
  )
}

/** What the home shows under its hero (the sign-ups), only while the visitor's
 *  card is a card: once it is becoming their profile, the page is that profile
 *  and nothing else, as a profile's page is. */
export function UnlessForming({ children }: { children: React.ReactNode }) {
  return useForming() ? null : children
}

/** A change to the card that may turn it into a profile or back (`forming`
 *  after it): when it does, made inside a view transition, so the browser
 *  carries the card from the middle to its column (or back) and fades the rest
 *  across; React draws the change inside it (`flushSync`). Otherwise, and under
 *  reduced motion or where there are no view transitions, just made. */
function shape(forming: boolean, change: () => void) {
  const was = filledLinks(readDraft()).length > 0
  if (
    was === forming ||
    !document.startViewTransition ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return change()
  document.startViewTransition(() => flushSync(change))
}
