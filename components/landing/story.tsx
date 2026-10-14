"use client";

import { useMemo } from "react";
import { Browser, BrowserSession } from "@/components/ui/browser";
import { ContactsApp, contactsAppScreen } from "@/components/ui/contacts-app";
import { IphoneFrame, MacbookFrame } from "@/components/ui/device-frame";
import { ScrollStage } from "@/components/ui/scroll-stage";
import {
  type ScrollBeat,
  useScrollStageTimeline,
} from "@/components/ui/scroll-stage-timeline";
import { type Landing, routePages } from "@/components/landing/link-map";
import { Scaled } from "@/components/landing/scaled";
import { EMOJI_DOMAIN } from "@/lib/const";
import { type BrowserStep, browserTimeline } from "@/lib/browser-session";
import { cn } from "@/lib/utils";

// WHAT A CARD DOES, told on one card of its own, as untitled.garden tells xtldr
// (apps/garden, xtldr-language-gallery): a rounded surface a step off the page,
// the act's words large inside it on the left, the thing on the right, a device
// standing taller than the card. Three scenes: every route of the one link,
// dealt as a deck of windows, each address showing; a phone, the contact a card
// saves as opened and saved in its Contacts app (@ag/contacts-app); a laptop, its
// browser at the card's /json and then on a site with the card embedded. Where
// the stage pins (@ag/scroll-stage) the scroll moves through them; elsewhere (a
// phone, reduced motion) the acts stand one after another.

/** One act: its headline in two tones (`lead` bright, `rest` dimmer), its line,
 *  and the press it is about. */
export type StoryAct = {
  lead: string;
  rest: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
};

type Page = { address: string; page: React.ReactNode };

type StoryProps = {
  username: string;
  /** The holder's card, the one link's own page. */
  card: React.ReactNode;
  landings: Landing[];
  /** The card as a contact: the very .vcf the save button downloads. */
  contact: { vcard: string; save: React.ReactNode };
  data: Page;
  embed: Page & { code: React.ReactNode };
};

/** The scroll each act gets, in shares of the track. An act plays over most of its
 *  share (`play`), rests on its last moment, and hands on to the next past
 *  `hold`. The routes take longest: one window dealt each. */
const BEATS: readonly ScrollBeat[] = [
  { span: 1.6, play: 0.8, hold: 0.9 },
  { span: 1.2, play: 0.7, hold: 0.85 },
  { span: 1.2, play: 0.75, hold: 0.85 },
  { span: 1, play: 0.7, hold: 0.9 },
];

/** The card the story is told on: the foreground a step into the page's ground
 *  (garden's `--card-bg`), rounded, as tall as the screen leaves under the site's
 *  bar and above its foot (10rem), within 28rem and 46rem. */
const CARD =
  "relative grid h-[clamp(28rem,calc(100svh-10rem),46rem)] grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-12 rounded-[2rem] bg-[color-mix(in_oklab,var(--foreground)_4%,var(--background))] px-12";

/** A window's page a step lighter than the site's ground (globals.css: 0.12; a
 *  card's surface 0.19), as the theme's own `--background` round it, so its page
 *  and the band behind its controls (@ag/browser) both take it. */
const GROUND = "[--background:oklch(0.17_0_0)]";

export function Story(props: StoryProps) {
  const story = useStory(props);
  return (
    <ScrollStage
      acts={story.acts.length}
      pace="110svh"
      tail="30svh"
      aria-label="what an e-ID does"
      stacked={<Stacked story={story} />}
    >
      <Scene story={story} />
    </ScrollStage>
  );
}

type Story = ReturnType<typeof useStory>;

/** The story's parts: the routes and their pages, the laptop's visit (the data,
 *  scrolled, then the site), and the acts. */
function useStory({ username, card, landings, contact, data, embed }: StoryProps) {
  return useMemo(() => {
    const home = `${EMOJI_DOMAIN}/${username}`;
    const steps: BrowserStep[] = [
      { kind: "scroll", to: 1, ms: 3200, delay: 600 },
      { kind: "type", text: embed.address, delay: 900 },
    ];
    const laptop = browserTimeline(data.address, steps);
    // Where the site's address starts being typed: the data's act ends there.
    const typed = laptop.starts[1];
    if (typed === undefined) throw new Error("story: the laptop types no address");
    return {
      routes: routePages(home, card, landings),
      vcard: contact.vcard,
      laptop: {
        start: data.address,
        steps,
        pages: { [data.address]: data.page, [embed.address]: embed.page },
        total: laptop.total,
        typed,
      },
      acts: [
        { lead: "one link", rest: "to route them all" },
        {
          lead: "easy",
          rest: "to save",
          body: "Your e-ID generates a vCard so people can save you as a contact.",
          action: contact.save,
        },
        { lead: "for programs", rest: "too", body: "just add /json to any profile" },
        { lead: "embed", rest: "on your website", action: embed.code },
      ] satisfies StoryAct[],
    };
  }, [username, card, landings, contact, data, embed]);
}

/** Where a scene stands for the acts' position (`offset`, fractional between two
 *  acts): 0 on stage, negative before it comes, positive once it has gone. A scene
 *  holding several acts (`from`..`to`) is on stage through all of them. */
function distance(offset: number, from: number, to = from): number {
  return offset < from ? offset - from : offset > to ? offset - to : 0;
}

/** A scene rising into the card from below and on up out of it, fading as it
 *  moves, taking no hand while it is on its way. */
function entrance(d: number): React.CSSProperties {
  const away = Math.min(1, Math.abs(d));
  return {
    opacity: Math.max(0, 1 - away * 1.4),
    transform: `translateY(${-d * 12}%)`,
    visibility: away >= 1 ? "hidden" : undefined,
  };
}

/** The pinned story: the card, the act's words in it, the scene beside them. */
function Scene({ story }: { story: Story }) {
  const beats = useScrollStageTimeline(BEATS, { top: "6rem", bottom: "4rem" });
  const { offset, active } = beats;
  const local = (act: number) => beats.progress[act] ?? 0;
  const { laptop } = story;
  // The laptop's visit across its two acts: the data scrolled through in the
  // first, the site's address typed and loaded in the second.
  const at =
    (active < 3
      ? local(2) * laptop.typed
      : laptop.typed + local(3) * (laptop.total - laptop.typed)) / laptop.total;
  return (
    <div className="mx-auto w-full max-w-6xl px-8">
      <div className={CARD}>
        <div className="flex min-w-0 flex-col justify-between py-12">
          <Words acts={story.acts} active={active} />
          <Acts acts={story.acts} active={active} onPick={beats.seek} />
        </div>
        {/* The scenes, centred in the right half; a device may stand taller
            than the card, past its top and foot. */}
        <div className="relative">
          <Layer d={distance(offset, 0)}>
            <Routes routes={story.routes} at={local(0)} />
          </Layer>
          <Layer d={distance(offset, 1)}>
            <Phone vcard={story.vcard} at={local(1)} className="h-[calc(100%+6rem)]" />
          </Layer>
          <Layer d={distance(offset, 2, 3)}>
            <Laptop laptop={laptop} at={at} className="w-[112%] shrink-0" />
          </Layer>
        </div>
      </div>
    </div>
  );
}

/** One scene in the card's right half, placed by how far it is from being on. */
function Layer({ d, children }: { d: number; children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      inert={Math.abs(d) >= 0.5}
      aria-hidden={Math.abs(d) >= 0.5}
      style={entrance(d)}
    >
      {children}
    </div>
  );
}

/** The act on stage, large: its headline in two tones, its line, its press. Every
 *  act's laid in one cell and only the one on stage shown, so the words never
 *  change the card's height. */
function Words({ acts, active }: { acts: StoryAct[]; active: number }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)]">
      {acts.map((act, i) => (
        <div
          key={act.lead}
          inert={i !== active}
          aria-hidden={i !== active}
          className={cn(
            "col-start-1 row-start-1 flex min-w-0 flex-col gap-6 transition-opacity duration-500",
            i === active ? "opacity-100" : "opacity-0",
          )}
        >
          <h3 className="text-5xl leading-[1.05] font-semibold tracking-tight text-balance">
            <span className="text-foreground">{act.lead}</span>{" "}
            <span className="text-foreground/45">{act.rest}</span>
          </h3>
          {act.body && (
            <p className="text-lg leading-relaxed text-pretty text-foreground/60">
              {act.body}
            </p>
          )}
          {act.action && <div className="min-w-0 pt-2">{act.action}</div>}
        </div>
      ))}
    </div>
  );
}

/** Every act by its number and headline, along the card's foot: where the story
 *  is, and a press on any scrolls there. */
function Acts({
  acts,
  active,
  onPick,
}: {
  acts: StoryAct[];
  active: number;
  onPick: (act: number) => void;
}) {
  return (
    <ol className="flex flex-wrap gap-x-5 gap-y-2">
      {acts.map((act, i) => (
        <li key={act.lead}>
          <button
            type="button"
            aria-current={i === active ? "step" : undefined}
            onClick={() => onPick(i)}
            className={cn(
              "flex cursor-pointer items-baseline gap-2 rounded-md text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-foreground/40",
              i === active ? "text-foreground" : "text-foreground/40 hover:text-foreground/70",
            )}
          >
            <span className="font-mono text-xs tabular-nums">0{i + 1}</span>
            {act.lead}
          </button>
        </li>
      ))}
    </ol>
  );
}

/** The design size the deck is drawn at, CSS px, scaled to its half of the card. */
const DECK = { width: 760, step: 58, window: 475 };

/** Every route of the one link, dealt as a deck as `at` runs 0..1: the window of
 *  the route being read in front, whole; the ones dealt before it stacked above,
 *  each still showing its address bar; the ones to come not yet dealt. */
function Routes({ routes, at }: { routes: Story["routes"]; at: number }) {
  const current = Math.min(routes.length - 1, Math.floor(at * routes.length));
  const height = DECK.window + (routes.length - 1) * DECK.step;
  return (
    <Scaled width={DECK.width} height={height} className="w-full">
      {routes.map((route, i) => {
        const dealt = i <= current;
        return (
          <div
            key={route.address}
            className={cn("absolute inset-x-0 transition-[transform,opacity,filter] duration-500 ease-out", GROUND)}
            style={{
              top: i * DECK.step,
              zIndex: i,
              opacity: dealt ? 1 : 0,
              transform: dealt ? undefined : "translateY(3rem)",
              // The windows behind sink back: dimmer, never see-through.
              filter: i < current ? "brightness(0.55)" : undefined,
            }}
          >
            <Browser material="glass" full url={route.address} scroll={0} inert>
              {route.page}
            </Browser>
          </div>
        );
      })}
    </Scaled>
  );
}

/** The phone, a .vcf just opened on it (`at` its act's moment, 0..1): the contact
 *  as iOS offers it, then "Create New Contact" pressed, then the contact saved in
 *  the phone's Contacts. */
function Phone({
  vcard,
  at,
  className,
}: {
  vcard: string;
  at: number;
  className?: string;
}) {
  const view = at >= 0.6 ? "contact" : "import";
  return (
    // The frame's status bar and screen in the app's colours (the frame draws
    // them outside the app's box). As tall as it is given, its width its own.
    <IphoneFrame
      className={cn("w-auto shrink-0", className)}
      style={contactsAppScreen(view, "dark")}
    >
      <ContactsApp vcard={vcard} view={view} pressed={view === "import" && at >= 0.42} />
    </IphoneFrame>
  );
}

/** The laptop, its browser at the card's data and then on a site with the card
 *  (`at` the visit's moment, 0..1). */
function Laptop({
  laptop,
  at,
  className,
}: {
  laptop: Story["laptop"];
  at: number;
  className?: string;
}) {
  return (
    <MacbookFrame className={cn(GROUND, className)}>
      <BrowserSession
        material="glass"
        full
        linked
        progress={at}
        start={laptop.start}
        steps={laptop.steps}
        pages={laptop.pages}
        alt="a laptop's browser at the card's data, then on a site with the card embedded"
        className="h-full rounded-none shadow-none"
      />
    </MacbookFrame>
  );
}

/** The story where the stage does not pin: each act's words, then its scene at
 *  rest (the deck dealt, the contact saved, the data at its top, the site). */
function Stacked({ story }: { story: Story }) {
  const scenes = [
    <Routes key="routes" routes={story.routes} at={1} />,
    <div key="phone" className="mx-auto h-[36rem]">
      <Phone vcard={story.vcard} at={1} className="h-full" />
    </div>,
    <Laptop key="data" laptop={story.laptop} at={0} className="w-full" />,
    <Laptop key="site" laptop={story.laptop} at={1} className="w-full" />,
  ];
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-24 px-4 py-24">
      {story.acts.map((act, i) => (
        <article key={act.lead} className="flex flex-col gap-6">
          <h3 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance">
            <span className="text-foreground">{act.lead}</span>{" "}
            <span className="text-foreground/45">{act.rest}</span>
          </h3>
          {act.body && (
            <p className="text-lg leading-relaxed text-pretty text-foreground/60">
              {act.body}
            </p>
          )}
          <div className="flex justify-center">{scenes[i]}</div>
          {act.action}
        </article>
      ))}
    </div>
  );
}
