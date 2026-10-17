import { inRole } from "@adriangalilea/utils/ansi"
import { kv } from "@adriangalilea/utils/cli"
import { Bot, IdCardIcon, Send } from "lucide-react"
import { cacheLife } from "next/cache"
import { type Holder, IdCard } from "@/components/id-card"
import { CardData } from "@/components/landing/card-data"
import type { Landing } from "@/components/landing/link-map"
import { LiveEmbed } from "@/components/landing/live-embed"
import { type CliScene, Story } from "@/components/landing/story"
import { SaveContact } from "@/components/save-contact"
import { BrowserCapturePage } from "@/components/ui/browser"
import { Code } from "@/components/ui/code"
import { EmailAddress } from "@/components/ui/email-address"
import { HoloLight } from "@/components/ui/holo"
import { atFound, foundOn, middleOf } from "@/lib/browser-capture"
import { cardOf } from "@/lib/card"
import { cardLines } from "@/lib/card-lines"
import type { Card } from "@/lib/card-schema"
import { EMOJI_DOMAIN } from "@/lib/const"
import { getShowcase } from "@/lib/data"
import { embedOf } from "@/lib/embed"
import { shortName } from "@/lib/link-names"
import { SHOTS } from "@/lib/link-shots"
import { getLinkIcon } from "@/lib/links"
import { fetchPhoto } from "@/lib/photo"
import { averageOf } from "@/lib/prepare-media"
import { vcardOf } from "@/lib/vcard"

/** WHAT A CARD DOES, under the hero: the scenes the page scrolls through
 *  (`Story`), each thing the card does shown as it really is (never a picture of
 *  it): everywhere its one link routes to, its contact saved on a phone, its data
 *  and its embed on a laptop. The card shown is a real one, the hero's lead
 *  (lib/data, `getShowcase`). */
export async function Features() {
  const [first] = await getShowcase()
  if (!first) throw new Error("the home has no card to show")
  const holder: Holder = {
    name: first.name,
    username: first.username,
    image: first.image,
    country: first.country_code,
    bio: first.bio,
    links: first.links,
  }
  // The same card as data, as a program gets it.
  const card = await cardOf(holder.username)
  if (!card) throw new Error(`the home's lead ${holder.username} has no card`)
  const at = `${EMOJI_DOMAIN}/${holder.username}`
  return (
    <Story
      username={holder.username}
      profile={profileOf(holder)}
      landings={landingsOf(holder)}
      contact={{
        ...(await contactOf(card)),
        save: (
          <SaveContact
            key="save"
            username={holder.username}
            size="lg"
            className="self-start"
          />
        ),
        page: phoneOf(holder),
        press: pressOf(holder),
      }}
      data={{
        address: `${at}/json`,
        page: (
          <div className="p-4">
            <CardData card={card} />
          </div>
        ),
      }}
      embed={{
        // The domain reserved for examples (RFC 2606): the address is live, and
        // any other would be someone's.
        address: "example.com",
        // The card as a byline at the foot of a post: where a site most often
        // says who made it.
        snippet: embedOf(holder.username, "compact"),
        // The real script and element working, as they do on someone's site.
        card: <LiveEmbed key="card" handle={holder.username} compact />,
        code: <EmbedCode username={holder.username} />,
      }}
      cli={cliSession(card)}
    />
  )
}

/** The CLI at work, beat by beat, each a command and what `eid` prints for it
 *  (cli/src/eid.ts), in its colours (the roles of `ROLES`, the ones its `ui` paints
 *  with), for a visitor signed in as `you`: a file sent from their machine and taken
 *  as they watch, the lead's real card (`cardLines`, the drawing `eid card` prints),
 *  and the skill for their agents. Each beat carries the words and mark the scene
 *  lights while it plays; the session (lib/terminal-session) is the beats joined,
 *  so a beat and its command cannot part. */
function cliSession(card: Card): CliScene {
  const sent = "eid.to/you/notes"
  const beats = [
    {
      label: "send a file",
      mark: <Send />,
      lines: [
        "$ eid send notes.zip",
        `${inRole("ok", "✓")} notes.zip ${inRole("muted", "2.4MB")} ${inRole("muted", "1.2s")}`,
        "",
        kv(
          [
            ["address", sent],
            [
              "get it",
              `npx @e-id/eid get ${sent}${inRole("muted", "  (copied)")}`,
            ],
            ["for", "anyone with the address"],
          ],
          { indent: 2 },
        ),
        "",
        inRole("muted", "  sending from this machine · Ctrl-C to stop"),
        `@1400   ${inRole("muted", "18:02:11")}  ${inRole("accent", "@ada")} is getting it`,
        `@1100   ${inRole("muted", "18:02:13")}  ${inRole("accent", "@ada")} ${inRole("ok", "got it")}`,
        "@800 ^C",
        inRole("muted", "  stopped: /notes is gone"),
      ],
    },
    {
      label: "look anyone up",
      mark: <IdCardIcon />,
      lines: [`$ eid card ${card.handle}`, cardLines(card, inRole)],
    },
    {
      label: "a skill for your agents",
      mark: <Bot />,
      lines: [
        "$ eid skill install",
        `${inRole("ok", "installed")} ~/.claude/skills/eid/SKILL.md`,
      ],
    },
  ]
  return {
    session: beats
      .map((b, i) => `${i ? "@700 " : ""}${b.lines.join("\n")}`)
      .join("\n\n"),
    beats: beats.map(({ label, mark }) => ({ label, mark })),
  }
}

/** Where each of the holder's routes lands (link-map): the first link of each
 *  platform, the one its route opens, as its page really looks, captured in both
 *  schemes by `pnpm captures` (captures.ts); an email as the compose window
 *  it opens. A link with no route (a link of their own) or no capture (a site
 *  that refuses a headless browser, X) is left out rather than drawn as something
 *  it is not. */
function landingsOf(holder: Holder): Landing[] {
  const links = holder.links ?? []
  const first = links.filter(
    (l, i) => links.findIndex((m) => m.platform === l.platform) === i,
  )
  // Captured for one handle, the home's lead (captures.ts); another lead has
  // none until the plan names them and `pnpm captures` runs.
  const captured = SHOTS.handle === holder.username ? SHOTS.shots : {}
  return first.flatMap((link): Landing[] => {
    const end = shortName(link.platform)
    if (!end) return []
    const icon = getLinkIcon(link.platform)
    if (link.platform === "email")
      return [{ end, icon, url: link.url, page: <Compose to={link.url} /> }]
    const shot = captured[link.platform]
    if (!shot) return []
    return [{ end, icon, url: shot.url, shot }]
  })
}

/** What an email address opens: the mail app's new message, to it, as large as a
 *  mail window opens on a laptop (@ag/email-address, its `window`). */
function Compose({ to }: { to: string }) {
  return (
    <div className="grid min-h-full place-items-center p-10">
      <EmailAddress address={to} form="window" />
    </div>
  )
}

/** The visit's first page, what the address with no end opens: the holder's
 *  profile as it really looks, captured by `pnpm captures` with their links. A
 *  lead not captured yet (the showcase's lead changed since) shows their card
 *  alone until the plan names them, rather than someone else's page. */
function profileOf(holder: Holder): React.ReactNode {
  if (SHOTS.handle === holder.username)
    return <BrowserCapturePage capture={SHOTS.profile} />
  return (
    <div className="grid min-h-full place-items-center p-6">
      <div className="w-full max-w-[18rem]">
        <HolderCard holder={holder} />
      </div>
    </div>
  )
}

/** Where a finger saves the contact on the phone's page: the middle of its save
 *  button, as the capture found it. None for a lead not captured yet. */
function pressOf(holder: Holder): { x: number; y: number } | undefined {
  if (SHOTS.handle !== holder.username) return undefined
  return middleOf(foundOn(SHOTS.phone, "save"))
}

/** The holder's profile as a phone shows it: the page itself on a phone, its
 *  mobile layout, ground and all, captured by `pnpm captures` with where its save
 *  button is (`found.save`), which the story presses: a finger's light laid on
 *  the button in the picture while the page round it is `data-pressing`. A lead
 *  not captured yet shows their card alone, as `profileOf` does. */
function phoneOf(holder: Holder): React.ReactNode {
  if (SHOTS.handle !== holder.username)
    return (
      <div key="phone" className="px-5 pt-6">
        <HolderCard holder={holder} />
      </div>
    )
  return (
    <BrowserCapturePage key="phone" capture={SHOTS.phone}>
      <div
        aria-hidden
        className="rounded-full bg-white/0 in-data-pressing:bg-white/20 transition-colors duration-150"
        style={atFound(SHOTS.phone, "save")}
      />
    </BrowserCapturePage>
  )
}

/** The holder's card, the profile's stand-in. */
function HolderCard({ holder }: { holder: Holder }) {
  return (
    <HoloLight className="w-full">
      <IdCard
        holder={holder}
        heading="p"
        holo="laminate"
        className="[--id-card-thickness:1]"
      />
    </HoloLight>
  )
}

/** The contact the card saves as: the very .vcf the save button downloads
 *  (lib/vcard, `vcardOf`), which the story's phone opens, and its photo's mean
 *  colour (prepare-media, `averageOf`), the phone's poster. Cached: the contact
 *  embeds the photo, fetched as it is built, which a page being prerendered may
 *  not do; the card is the key, so a changed card is a new contact. */
async function contactOf(
  card: Card,
): Promise<{ vcard: string; average: string | undefined }> {
  "use cache"
  cacheLife("days")
  const photo = await fetchPhoto(card.photo, "the home's contact")
  return {
    vcard: await vcardOf(card),
    average: photo ? await averageOf(photo.bytes) : undefined,
  }
}

/** The embed's two lines (`embedOf`) as the code a site pastes in (@ag/code,
 *  glass, its copy in its bar). Cached: the highlighter reads the clock as it
 *  works, which a page being prerendered may not, and the snippet only changes
 *  with the handle. */
async function EmbedCode({ username }: { username: string }) {
  "use cache"
  cacheLife("max")
  return (
    <Code lang="html" filename="index.html" material="glass">
      {embedOf(username, "compact")}
    </Code>
  )
}
