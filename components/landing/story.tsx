"use client";

import { useMemo } from "react";
import { Browser, BrowserSession } from "@/components/ui/browser";
import { ContactsApp, contactsAppScreen } from "@/components/ui/contacts-app";
import { IphoneFrame, MacbookFrame } from "@/components/ui/device-frame";
import { Grain } from "@/components/ui/grain";
import { ScrollStage } from "@/components/ui/scroll-stage";
import {
  type ScrollBeat,
  useScrollStageTimeline,
} from "@/components/ui/scroll-stage-timeline";
import { type Landing, routePages } from "@/components/landing/link-map";
import { Scaled } from "@/components/landing/scaled";
import { SubjectLight } from "@/components/light";
import { EMOJI_DOMAIN } from "@/lib/const";
import { type BrowserStep, browserTimeline } from "@/lib/browser-session";
import { cn } from "@/lib/utils";

// WHAT A CARD DOES, told in three scenes on one stage. First every route of the
// one link, side by side, each window at its route over the real page it leads
// to. Then a phone: the contact a card saves as, opened as a .vcf
// and saved in the phone's own Contacts app (@ag/contacts-app). Then a laptop: its
// browser at the card's /json, scrolled through, and then on a site with the card
// embedded. Where the stage pins (a wide screen, motion welcome: @ag/scroll-stage)
// the page's scroll moves through them, the words on the left saying where it is;
// elsewhere (a phone, reduced motion) the scenes stand one after another.

/** One act of the story: what it is called, what it says, and the press it is
 *  about. */
export type StoryAct = {
  title: string;
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
 *  share (`play`), rests on its last moment, and hands on to the next over the
 *  rest (past `hold`). */
const BEATS: readonly ScrollBeat[] = [
  { span: 1.2, play: 0.5, hold: 0.8 },
  { span: 1.2, play: 0.7, hold: 0.85 },
  { span: 1.2, play: 0.75, hold: 0.85 },
  { span: 1, play: 0.7, hold: 0.9 },
];

/** Every scene's design size, CSS px: a 16:10 stage, scaled whole to the space
 *  it is given (`Scaled`). */
const STAGE = { width: 1280, height: 800 };

/** The stage where it pins: as tall as the screen leaves under the site's bar
 *  (6rem over it, 1.5rem under), its width from its own 16:10, never wider than
 *  its column. */
const FRAME = "relative ml-auto w-full max-w-[calc((100svh-7.5rem)*1.6)]";

/** A page a step lighter than the site's ground (globals.css: 0.12; a card's
 *  surface 0.19), as a surface on this site stands a step above the ground. Set
 *  as the theme's own `--background` round a window, so its page and the band
 *  behind its controls (@ag/browser) both take it. */
const GROUND = "[--background:oklch(0.155_0_0)]";

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
        { title: "one link to route them all" },
        {
          title: "easy to save",
          body: "Your e-ID generates a vCard so people can save you as a contact.",
          action: contact.save,
        },
        { title: "for programs too", body: "just add /json to any profile" },
        { title: "embed on your website", action: embed.code },
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

/** A scene coming up into the stage from below and going on up out of it, fading
 *  in and out as it moves, and taking no hand while it is on its way. */
function entrance(d: number): React.CSSProperties {
  const away = Math.min(1, Math.abs(d));
  return {
    opacity: Math.max(0, 1 - away * 1.4),
    transform: `translateY(${-d * 10}%) scale(${1 - away * 0.05})`,
    visibility: away >= 1 ? "hidden" : undefined,
  };
}

/** The pinned story: the words and the stage side by side, centred in the screen
 *  under the site's bar, the scroll moving through the scenes. */
function Scene({ story }: { story: Story }) {
  const beats = useScrollStageTimeline(BEATS, { top: "6rem", bottom: "1.5rem" });
  const { offset, active } = beats;
  const local = (act: number) => beats.progress[act] ?? 0;
  // The laptop's visit across its two acts: the data scrolled through in the
  // first, the site's address typed and loaded in the second.
  const { laptop } = story;
  const at =
    (active < 3 ? local(2) * laptop.typed : laptop.typed + local(3) * (laptop.total - laptop.typed)) /
    laptop.total;
  return (
    // The words a narrow column of their own; the stage everything else.
    <div className="mx-auto grid w-full max-w-[100rem] grid-cols-[20rem_minmax(0,1fr)] items-center gap-12 px-8">
      <Words acts={story.acts} active={active} onPick={beats.seek} />
      <div className={FRAME}>
        {/* What the stage shows stands in a soft light of its own, with a faint
            shimmer round it, as the hero's cards do (components/light). */}
        <SubjectLight />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[20%] -z-10 [mask-image:radial-gradient(ellipse_closest-side,black_35%,transparent)]"
        >
          <Grain look="shimmer" strength={0.35} density={0.3} frost={0.01} hand={false} />
        </div>
        <Scaled {...STAGE}>
          <Layer d={distance(offset, 0)}>
            <Routes routes={story.routes} columns={3} />
          </Layer>
          <Layer d={distance(offset, 1)}>
            <Phone vcard={story.vcard} at={local(1)} />
          </Layer>
          <Layer d={distance(offset, 2, 3)}>
            <Laptop laptop={story.laptop} at={at} />
          </Layer>
        </Scaled>
      </div>
    </div>
  );
}

/** One scene on the stage, placed by how far it is from being on it. */
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

/** The gap between the routes' windows, design px. */
const GAP = 24;

/** Every route of the one link at once: a window each, at its route, over the
 *  page it leads to, `columns` to a row (16:10 each), as many rows as there are
 *  routes. */
function Routes({ routes, columns }: { routes: Story["routes"]; columns: number }) {
  return (
    <div
      className={cn("grid w-full content-center", GROUND)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: GAP }}
    >
      {routes.map((route) => (
        <Browser key={route.address} material="glass" full url={route.address} scroll={0} inert>
          {route.page}
        </Browser>
      ))}
    </div>
  );
}

/** The design height `columns` of routes take at `width`: their rows of 16:10
 *  windows and the gaps between them. */
function routesHeight(count: number, columns: number, width: number): number {
  const rows = Math.ceil(count / columns);
  const cell = (width - (columns - 1) * GAP) / columns;
  return Math.ceil(rows * (cell / 1.6) + (rows - 1) * GAP);
}

/** The phone, a .vcf just opened on it (`at` its act's moment, 0..1): the contact
 *  as iOS offers it, then "Create New Contact" pressed, then the contact saved in
 *  the phone's Contacts. */
function Phone({ vcard, at }: { vcard: string; at: number }) {
  const view = at >= 0.6 ? "contact" : "import";
  return (
    // The frame's status bar and screen in the app's colours (the frame draws
    // them outside the app's box).
    <IphoneFrame className="w-[360px]" style={contactsAppScreen(view, "dark")}>
      <ContactsApp
        vcard={vcard}
        view={view}
        pressed={view === "import" && at >= 0.42}
      />
    </IphoneFrame>
  );
}

/** The laptop, its browser at the card's data and then on a site with the card
 *  (`at` the visit's moment, 0..1). */
function Laptop({ laptop, at }: { laptop: Story["laptop"]; at: number }) {
  return (
    <MacbookFrame className={cn("w-[1060px]", GROUND)}>
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

/** Every act's title, the one on stage lit, the rest dim: where the story is, and
 *  a press on any title scrolls there. The one on stage opens under its title to
 *  its line and its press.
 *
 *  The column is the same height whichever act is open: the stage is centred on
 *  its own height (useScrollStageTimeline), and a column that grew and shrank as
 *  acts opened moved the whole stage. So two layers share one cell: the titles
 *  with the tallest act's opening laid out unseen, which alone gives the cell its
 *  height, and over it the titles as they are, one open. */
function Words({
  acts,
  active,
  onPick,
}: {
  acts: StoryAct[];
  active: number;
  onPick: (act: number) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)]">
      <div aria-hidden inert className="invisible col-start-1 row-start-1 flex min-w-0 flex-col gap-4">
        {acts.map((act, i) => (
          <Title key={act.title} act={act} index={i} />
        ))}
        <div className="grid grid-cols-[minmax(0,1fr)]">
          {acts.map((act) => (
            <div key={act.title} className="col-start-1 row-start-1 min-w-0">
              <Opening act={act} />
            </div>
          ))}
        </div>
      </div>
      <ol className="col-start-1 row-start-1 flex min-w-0 flex-col gap-4 self-start">
        {acts.map((act, i) => {
          const on = i === active;
          return (
            <li key={act.title} className="min-w-0">
              <button
                type="button"
                aria-current={on ? "step" : undefined}
                onClick={() => onPick(i)}
                className={cn(
                  "block cursor-pointer rounded-lg text-left transition-opacity duration-500 outline-none focus-visible:ring-2 focus-visible:ring-foreground/40",
                  on ? "opacity-100" : "opacity-35 hover:opacity-60",
                )}
              >
                <Title act={act} index={i} />
              </button>
              {(act.body || act.action) && (
                <div
                  className="grid grid-cols-[minmax(0,1fr)] transition-[grid-template-rows,opacity] duration-500 ease-out"
                  style={{ gridTemplateRows: on ? "1fr" : "0fr", opacity: on ? 1 : 0 }}
                  inert={!on}
                >
                  <div className="min-h-0 min-w-0 overflow-hidden">
                    <Opening act={act} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** An act's number and title, one line of the list. */
function Title({ act, index }: { act: StoryAct; index: number }) {
  return (
    <span className="flex items-baseline gap-4">
      <span className="font-mono text-xs text-foreground/50 tabular-nums">
        0{index + 1}
      </span>
      <h3 className="text-2xl font-light tracking-[-0.02em] text-balance text-foreground/90">
        {act.title}
      </h3>
    </span>
  );
}

/** What an act opens to under its title: its line and its press, inset to the
 *  title's words, with room inside the fold (which clips) for the press's glass
 *  edge and shadow. */
function Opening({ act }: { act: StoryAct }) {
  if (!act.body && !act.action) return null;
  return (
    <div className="flex min-w-0 flex-col gap-5 pt-3 pr-2 pb-3 pl-8">
      {act.body && (
        <p className="text-base leading-relaxed font-light text-balance text-foreground/60">
          {act.body}
        </p>
      )}
      {act.action && <div className="min-w-0">{act.action}</div>}
    </div>
  );
}

/** The story where the stage does not pin: each act's words over its scene, the
 *  scenes at rest (the routes, the contact saved, the data at its top, the site),
 *  each at a design size of its own for a narrow column: the routes two to a
 *  row, the phone alone. */
function Stacked({ story }: { story: Story }) {
  const scenes = [
    {
      width: 760,
      height: routesHeight(story.routes.length, 2, 760),
      node: <Routes routes={story.routes} columns={2} />,
    },
    { width: 420, height: 820, node: <Phone vcard={story.vcard} at={1} /> },
    { width: 1100, height: 740, node: <Laptop laptop={story.laptop} at={0} /> },
    { width: 1100, height: 740, node: <Laptop laptop={story.laptop} at={1} /> },
  ];
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-24 px-4 py-24">
      {story.acts.map((act, i) => (
        <article key={act.title} className="flex flex-col gap-6">
          <h3 className="text-3xl font-light tracking-[-0.02em] text-balance text-foreground/90">
            {act.title}
          </h3>
          {act.body && (
            <p className="text-lg leading-relaxed font-light text-balance text-foreground/60">
              {act.body}
            </p>
          )}
          <Scaled
            width={scenes[i]?.width ?? STAGE.width}
            height={scenes[i]?.height ?? STAGE.height}
            className="mx-auto w-full"
            style={{ maxWidth: scenes[i]?.width }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {scenes[i]?.node}
            </div>
          </Scaled>
          {act.action}
        </article>
      ))}
    </div>
  );
}
