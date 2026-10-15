"use client";

import {
  Braces,
  Code,
  Contact,
  IdCard,
  type LucideIcon,
  Route as RouteIcon,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
// the act's words large down its left, the thing filling the rest. Three scenes:
// a laptop, each of the one link's routes typed into its browser and landing on
// the real page it leads to; a phone, the contact a card saves as opened and saved
// in its Contacts app (@ag/contacts-app); the laptop again, its browser at the
// card's /json and then on a site with the card embedded. A screen is drawn at a
// screen's size and scaled whole (`Scaled`), so a browser's chrome keeps a real
// one's proportions at any size. Where the stage pins (@ag/scroll-stage)
// the scroll moves through the scenes; elsewhere (a phone, reduced motion) the
// acts stand one after another.

/** One act: its headline in two tones (`lead` bright, `rest` dimmer), its line,
 *  and the press it is about. */
export type StoryAct = {
  /** What the act is about, at a glance, beside its name in the acts' bar. */
  Icon: LucideIcon;
  /** Its name in the acts' bar: the thing itself, never the headline's word. */
  name: string;
  lead: string;
  rest: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
};

type Page = { address: string; page: React.ReactNode };

type StoryProps = {
  username: string;
  /** The holder's profile, the one link's own page. */
  profile: React.ReactNode;
  landings: Landing[];
  /** The card as a contact: the very .vcf the save button downloads, its photo's
   *  mean colour (the phone's poster), the press that saves it, and the profile
   *  as the phone's Safari shows it, where that press is made. */
  contact: {
    vcard: string;
    average: string | undefined;
    save: React.ReactNode;
    page: React.ReactNode;
  };
  data: Page;
  embed: Page & { code: React.ReactNode };
};

/** The scroll each act gets, in shares of the track. An act plays over most of its
 *  share (`play`), rests on its last moment, and hands on to the next past
 *  `hold`. The routes take longest: one landing each. */
const BEATS: readonly ScrollBeat[] = [
  { span: 2.2, play: 0.78, hold: 0.95 },
  { span: 2, play: 0.85, hold: 0.94 },
  { span: 1.2, play: 0.75, hold: 0.85 },
  { span: 1, play: 0.7, hold: 0.9 },
];

/** The card the story is told on: the foreground a step into the page's ground
 *  (garden's `--card-bg`), rounded, as tall as the screen leaves under the site's
 *  bar and above its foot (8rem), within 34rem and 54rem. Two columns: the act's
 *  words and the acts down the left, a column of reading width; the scene filling
 *  the rest, the card's whole height. */
const CARD =
  "relative grid h-[clamp(34rem,calc(100svh-8rem),54rem)] grid-cols-[clamp(16rem,24%,22rem)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] gap-x-10 gap-y-6 rounded-[2rem] bg-[color-mix(in_oklab,var(--foreground)_4%,var(--background))] p-10";

/** The screen's size, CSS px, before it is scaled to where it is shown: a small
 *  laptop's, so what is on it reads at the size a laptop is drawn here (a 1440
 *  screen shrunk to a card's half came out as fine print). */
const SCREEN = { width: 1024, height: 640 };

/** The devices' shapes, width over height (device-frame.css): an iPhone's frame,
 *  a MacBook's display with its lid and base. */
const IPHONE = 356 / 730;
const MACBOOK = 1.48;

/** The laptop's menu bar under its notch, as tall as macOS draws it beside one. */
const MENU_BAR = 30;

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

/** A visit a browser plays, and its length. */
type Visit = {
  start: string;
  steps: BrowserStep[];
  pages: Record<string, React.ReactNode>;
  total: number;
};

/** The story's parts: the routes' visit, the laptop's visit (the data, scrolled,
 *  then the site), and the acts. */
function useStory({
  username,
  profile,
  landings,
  contact,
  data,
  embed,
}: StoryProps) {
  return useMemo(() => {
    const home = `${EMOJI_DOMAIN}/${username}`;
    // The routes: the address opens on the profile; each route typed onto it, one
    // load landing on the place's own page (a capture), or on what is drawn for
    // an end with no page (an email's compose window).
    const [own, ...ends] = routePages(home, profile, landings);
    if (!own) throw new Error("story: the one link has no page");
    const routeSteps: BrowserStep[] = [];
    const routePagesByUrl: Record<string, React.ReactNode> = {
      [home]: own.page,
    };
    // The one link pasted whole each time, only its route (`/gh`) typed onto it.
    landings.forEach((l, i) => {
      const end = ends[i];
      if (!end) throw new Error(`story: ${l.end} has no page`);
      const typed = { kind: "type", pasted: home, text: end.address } as const;
      if (l.shot) {
        routePagesByUrl[l.url] = end.page;
        routeSteps.push({ ...typed, to: l.url, delay: 900 });
      } else {
        routePagesByUrl[end.address] = end.page;
        routeSteps.push({ ...typed, delay: 900 });
      }
    });
    const routeTimeline = browserTimeline(home, routeSteps);
    const routes = {
      start: home,
      steps: routeSteps,
      pages: routePagesByUrl,
      total: routeTimeline.total,
      // When each end's address starts being typed: the route it is on from then.
      starts: routeTimeline.starts,
    } satisfies Visit & { starts: number[] };
    const laptopSteps: BrowserStep[] = [
      { kind: "scroll", to: 1, ms: 3200, delay: 600 },
      { kind: "type", text: embed.address, delay: 900 },
    ];
    const laptopTimeline = browserTimeline(data.address, laptopSteps);
    // Where the site's address starts being typed: the data's act ends there.
    const typed = laptopTimeline.starts[1];
    if (typed === undefined)
      throw new Error("story: the laptop types no address");
    return {
      // Every route, the one link's own first: its address and its icon.
      stops: [
        { address: own.address, icon: <IdCard /> },
        ...ends.map((e, i) => ({
          address: e.address,
          icon: landings[i]?.icon,
        })),
      ],
      routes,
      contact,
      code: embed.code,
      laptop: {
        start: data.address,
        steps: laptopSteps,
        pages: { [data.address]: data.page, [embed.address]: embed.page },
        total: laptopTimeline.total,
        typed,
      },
      acts: [
        {
          Icon: RouteIcon,
          name: "one link",
          lead: "one link",
          rest: "to route them all",
        },
        {
          Icon: Contact,
          name: "vCard",
          lead: "easy",
          rest: "to save",
          body: "Your e-ID generates a vCard so people can save you as a contact.",
          action: contact.save,
        },
        {
          Icon: Braces,
          name: "for programs",
          lead: "for programs",
          rest: "too",
          body: "just add /json to any profile",
        },
        { Icon: Code, name: "embed", lead: "embed", rest: "on your website" },
      ] satisfies StoryAct[],
    };
  }, [username, profile, landings, contact, data, embed]);
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
    transform: `translateY(${-d * 10}%)`,
    visibility: away >= 1 ? "hidden" : undefined,
  };
}

/** The pinned story: the card, the act's words across its top, the scene
 *  filling the rest, the acts along its foot. */
function Scene({ story }: { story: Story }) {
  const beats = useScrollStageTimeline(BEATS, {
    top: "5.5rem",
    bottom: "1.5rem",
  });
  const { offset, active } = beats;
  const local = (act: number) => beats.progress[act] ?? 0;
  const { laptop, routes } = story;
  // The laptop's visit across its two acts: the data scrolled through in the
  // first, the site's address typed and loaded in the second.
  const laptopAt =
    (active < 3
      ? local(2) * laptop.typed
      : laptop.typed + local(3) * (laptop.total - laptop.typed)) / laptop.total;
  // Which route the visit is on: the one link itself, then each end from the
  // moment its address starts being typed.
  const routeMs = local(0) * routes.total;
  const route = routes.starts.filter((s) => s <= routeMs).length;
  return (
    <div className="mx-auto w-full max-w-[96rem] px-8">
      <div className={CARD}>
        <Words
          acts={story.acts}
          active={active}
          more={[
            <Route
              key="routes"
              home={routes.start}
              stops={story.stops}
              current={route}
            />,
          ]}
        />
        <div className="relative min-h-0">
          <Layer d={distance(offset, 0)}>
            <Fit ratio={MACBOOK}>
              <Laptop
                visit={routes}
                at={local(0)}
                alt="each route of the one link typed in a laptop's browser, landing on the page it leads to"
              />
            </Fit>
          </Layer>
          <Layer d={distance(offset, 1)}>
            <Fit ratio={IPHONE} className="py-2">
              <Phone
                contact={story.contact}
                address={routes.start}
                at={local(1)}
              />
            </Fit>
          </Layer>
          <Layer d={distance(offset, 2, 3)}>
            <Fit ratio={MACBOOK}>
              <Laptop
                visit={laptop}
                at={laptopAt}
                alt="a laptop's browser at the card's data, then on a site with the card embedded"
              />
            </Fit>
          </Layer>
          <Layer d={distance(offset, 3)} align="end">
            <div className="w-[min(100%,38rem)] p-6">{story.code}</div>
          </Layer>
        </div>
        <Acts acts={story.acts} active={active} onPick={beats.seek} />
      </div>
    </div>
  );
}

/** One scene in the card, placed by how far it is from being on; centred, or
 *  at the scene's foot on the left (`end`), in front of what is centred. */
function Layer({
  d,
  align = "center",
  children,
}: {
  d: number;
  align?: "center" | "end";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex",
        align === "center"
          ? "items-center justify-center"
          : "pointer-events-none items-end justify-start *:pointer-events-auto",
      )}
      inert={Math.abs(d) >= 0.5}
      aria-hidden={Math.abs(d) >= 0.5}
      style={entrance(d)}
    >
      {children}
    </div>
  );
}

/** A thing of one shape (`ratio`, width over height) as large as it fits in the
 *  box it is given, centred: its width the box's, or the box's height times its
 *  shape, whichever is smaller. */
function Fit({
  ratio,
  className,
  children,
}: {
  ratio: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("grid size-full place-items-center", className)}
      style={{ containerType: "size" }}
    >
      <div style={{ width: `min(100cqw, ${ratio} * 100cqh)` }}>{children}</div>
    </div>
  );
}

/** The route the browser is on: the one link, its end (`/gh`, `/web`) lit. */
function Route({
  home,
  stops,
  current,
}: {
  home: string;
  stops: Story["stops"];
  current: number;
}) {
  const address = stops[current]?.address ?? home;
  return (
    <div className="flex flex-col gap-5">
      <p className="truncate font-mono text-xl">
        <span className="text-foreground/45">{home}</span>
        <span className="text-foreground">{address.slice(home.length)}</span>
      </p>
      {/* Where the visit is: each route's icon, the one it is on lit, those it
          has been to a step brighter than those to come. */}
      <ol className="flex gap-1.5" aria-label="the one link's routes">
        {stops.map((stop, i) => (
          <li
            key={stop.address}
            aria-current={i === current ? "step" : undefined}
            className={cn(
              `grid size-10 place-items-center rounded-full transition-colors
              duration-300 [&_svg]:size-5 [&_svg]:stroke-[1.75]`,
              i === current
                ? "bg-foreground text-background"
                : i < current
                  ? "text-foreground/70"
                  : "text-foreground/30",
            )}
          >
            {stop.icon}
            <span className="sr-only">{stop.address}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The act on stage: its headline in two tones, its line, its press, and what
 *  else it shows beside the scene (`more`, by act). Every act's laid in one cell
 *  and only the one on stage shown, so the words never change the card's
 *  layout. */
function Words({
  acts,
  active,
  more,
}: {
  acts: StoryAct[];
  active: number;
  more: React.ReactNode[];
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)]">
      {acts.map((act, i) => (
        <div
          key={act.lead}
          inert={i !== active}
          aria-hidden={i !== active}
          className={cn(
            `col-start-1 row-start-1 flex min-w-0 flex-col gap-6
            transition-opacity duration-500`,
            i === active ? "opacity-100" : "opacity-0",
          )}
        >
          <h3
            className="text-5xl leading-[1.05] font-semibold tracking-tight
              text-balance"
          >
            <span className="text-foreground">{act.lead}</span>{" "}
            <span className="text-foreground/45">{act.rest}</span>
          </h3>
          {act.body && (
            <p
              className="text-lg leading-relaxed text-pretty text-foreground/60"
            >
              {act.body}
            </p>
          )}
          {act.action}
          {more[i]}
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
    <div className="col-span-2 flex justify-center">
      <ToggleGroup
        size="lg"
        aria-label="what an e-ID does"
        value={String(active)}
        onValueChange={(v) => onPick(Number(v))}
      >
        {acts.map((act, i) => (
          <ToggleGroupItem key={act.name} value={String(i)}>
            <act.Icon />
            {act.name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

/** An iPhone's screen in points (iPhone 16 Pro, inside device-frame's bezel):
 *  what the phone's Safari is laid out at before it is scaled to the frame, so
 *  the page reads as it does on a real one. */
const PHONE_SCREEN = { width: 402, height: 842 };

/** The save, as it happens on a phone, over the act (`at`, 0..1): where each
 *  moment starts. Safari on the profile; "save contact" pressed; iOS 26's sheet
 *  rising with the contact, read down; done; the contact saved, read down. */
const SAVE = {
  press: 0.18,
  sheet: 0.26,
  sheetIn: 0.1,
  read: 0.38,
  done: 0.66,
  saved: 0.72,
};

const share = (at: number, from: number, length: number) =>
  Math.min(1, Math.max(0, (at - from) / length));

/** The phone, through the save (`SAVE`, `at` the act's moment): the holder's
 *  profile in Safari, its save pressed, the contact iOS raises over it scrolled
 *  through, then saved in Contacts on the poster of its photo's colour. Down as
 *  the reader scrolls down, back as they scroll up. */
function Phone({
  contact,
  address,
  at,
}: {
  contact: Story["contact"];
  address: string;
  at: number;
}) {
  const saved = at >= SAVE.saved;
  const raised = share(at, SAVE.sheet, SAVE.sheetIn);
  const view = saved ? "contact" : raised > 0 ? "preview" : null;
  return (
    // The frame's status bar and screen in the app's colours (the frame draws
    // them outside the app's box).
    <IphoneFrame style={contactsAppScreen(view ?? "preview", contact.average)}>
      <Scaled {...PHONE_SCREEN} className="absolute inset-0 w-full">
        <div
          className="absolute inset-0"
          data-pressing={(at >= SAVE.press && at < SAVE.sheet) || undefined}
        >
          <Browser
            look="safari-ios"
            material="glass"
            scheme="dark"
            url={`https://${address}`}
            full
          >
            {contact.page}
          </Browser>
        </div>
      </Scaled>
      {view && (
        <>
          {/* Safari dimmed under the sheet as it rises. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-black"
            style={{ opacity: 0.5 * raised }}
          />
          <div
            className="absolute inset-0"
            style={
              view === "preview"
                ? { transform: `translateY(${(1 - raised) * 100}%)` }
                : undefined
            }
          >
            <ContactsApp
              vcard={contact.vcard}
              view={view}
              scroll={
                view === "preview"
                  ? share(at, SAVE.read, SAVE.done - SAVE.read)
                  : share(at, SAVE.saved + 0.04, 1 - SAVE.saved - 0.04)
              }
              average={contact.average}
              // Over Safari, the sheet's surround is the page behind, dimmed.
              className={view === "preview" ? "bg-transparent" : undefined}
            />
          </div>
        </>
      )}
    </IphoneFrame>
  );
}

/** The laptop, as wide as it is given, its screen a real screen scaled whole (the
 *  menu bar under the notch, the browser filling the rest), playing a visit (`at`
 *  its moment, 0..1). */
function Laptop({ visit, at, alt }: { visit: Visit; at: number; alt: string }) {
  return (
    <MacbookFrame className={GROUND}>
      <Scaled {...SCREEN} className="w-full">
        <div className="absolute inset-0 flex flex-col bg-black">
          <div
            className="flex shrink-0 items-center gap-6 px-5 text-[13px]
              font-medium text-white/90"
            style={{
              height: MENU_BAR,
              fontFamily: "-apple-system, system-ui, sans-serif",
            }}
          >
            <span className="font-semibold">Safari</span>
            <span>File</span>
            <span>Edit</span>
            <span>View</span>
            <span>History</span>
          </div>
          <div className="min-h-0 flex-1">
            <BrowserSession
              material="glass"
              full
              linked
              progress={at}
              start={visit.start}
              steps={visit.steps}
              pages={visit.pages}
              alt={alt}
              className="aspect-auto h-full w-full rounded-none shadow-none"
            />
          </div>
        </div>
      </Scaled>
    </MacbookFrame>
  );
}

/** The story where the stage does not pin: each act's words, then its scene at
 *  rest (the visit at its last route, the contact saved, the data at its top, the
 *  site). */
function Stacked({ story }: { story: Story }) {
  const { routes } = story;
  const scenes = [
    <div key="routes" className="w-full">
      <Laptop visit={routes} at={1} alt="the one link's last route, landed" />
    </div>,
    <div key="phone" className="mx-auto w-64">
      <Phone contact={story.contact} address={routes.start} at={SAVE.saved} />
    </div>,
    <div key="data" className="w-full">
      <Laptop
        visit={story.laptop}
        at={0}
        alt="a laptop's browser at the card's data"
      />
    </div>,
    <div key="site" className="flex w-full min-w-0 flex-col gap-6">
      <Laptop
        visit={story.laptop}
        at={1}
        alt="a laptop's browser on a site with the card embedded"
      />
      {story.code}
    </div>,
  ];
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-24 px-4 py-24">
      {story.acts.map((act, i) => (
        // A column of the phone's width at most: the code in it scrolls in its
        // own box, never widening the page.
        <article key={act.lead} className="flex min-w-0 flex-col gap-6">
          <h3
            className="text-4xl leading-[1.05] font-semibold tracking-tight
              text-balance"
          >
            <span className="text-foreground">{act.lead}</span>{" "}
            <span className="text-foreground/45">{act.rest}</span>
          </h3>
          {act.body && (
            <p
              className="text-lg leading-relaxed text-pretty text-foreground/60"
            >
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
