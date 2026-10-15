"use client";

import {
  Braces,
  Code,
  Contact,
  IdCard,
  Route as RouteIcon,
} from "lucide-react";
import { useMemo } from "react";
import { Browser, BrowserSession } from "@/components/ui/browser";
import { ContactsApp, contactsAppScreen } from "@/components/ui/contacts-app";
import { IphoneFrame, MacbookFrame } from "@/components/ui/device-frame";
import {
  ScrollStory,
  type StoryChapter,
  StoryCard,
  StoryTitle,
} from "@/components/ui/scroll-story";
import { type Landing, routePages } from "@/components/landing/link-map";
import { Scaled } from "@/components/landing/scaled";
import { EMOJI_DOMAIN } from "@/lib/const";
import { Ide } from "@/components/ui/ide";
import { type BrowserStep, browserTimeline } from "@/lib/browser-session";
import { AmbientLight } from "@/components/ui/ambient-light";
import { cn } from "@/lib/utils";

// WHAT A CARD DOES, told on the scroll (@ag/scroll-story), a card per chapter
// sliding in from the side as untitled.garden tells xtldr: a laptop, each of the
// one link's routes typed into its browser and landing on the real page it leads
// to; a phone, the save as it happens (the profile in Safari, its save pressed,
// iOS's sheet, the contact in Contacts); a laptop at the card's /json; a laptop on
// a site with the card embedded, the code beside it. A device stands out of its
// card. A screen is drawn at a real screen's size and scaled whole (`Scaled`), so
// a browser's chrome keeps a real one's proportions at any size.

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
  embed: {
    /** The site the card is embedded on. */
    address: string;
    /** The two lines a site pastes in (lib/card-schema `embedOf`), typed into
     *  the site's page. */
    snippet: string;
    /** The card as the embed draws it on the site. */
    card: React.ReactNode;
    /** The same two lines, to copy. */
    code: React.ReactNode;
  };
};

/** The laptop's screen, CSS px, before it is scaled to where it is shown: a small
 *  laptop's, so what is on it reads at the size a laptop is drawn here (a 1440
 *  screen shrunk to a card's half came out as fine print). */
const SCREEN = { width: 1024, height: 640 };

/** The devices' shapes, width over height (device-frame.css): an iPhone's frame,
 *  a MacBook's display with its lid and base. */
const IPHONE = 356 / 730;
const MACBOOK = 1.48;

/** The laptop's menu bar under its notch, as tall as macOS draws it beside one. */
const MENU_BAR = 30;

/** How far a device stands out of its card, past its top and its foot. */
const OUT = "2.5rem";

/** A window's page a step lighter than the site's ground (globals.css: 0.12; a
 *  card's surface 0.21), as the theme's own `--background` round it, so its page
 *  and the band behind its controls (@ag/browser) both take it. */
const GROUND = "[--background:oklch(0.17_0_0)]";

/** A visit a browser plays, and its length. */
type Visit = {
  start: string;
  steps: BrowserStep[];
  pages: Record<string, React.ReactNode>;
  total: number;
};

export function Story(props: StoryProps) {
  const story = useStory(props);
  const { routes, laptop, contact, site } = story;
  const chapters = useMemo(
    (): StoryChapter[] => [
      {
        id: "link",
        label: "one link",
        mark: <RouteIcon />,
        // One landing each: the longest chapter, played over most of it.
        span: 2.2,
        play: 0.78,
        hold: 0.95,
        content: ({ p }) => (
          <StoryCard
            title={<StoryTitle lead="one link" rest="to route them all" />}
            aside={
              <Route
                home={routes.start}
                stops={story.stops}
                current={
                  routes.starts.filter((s) => s <= p * routes.total).length
                }
              />
            }
            overflow
            scene={
              <Fit ratio={MACBOOK}>
                <Laptop
                  visit={routes}
                  at={p}
                  alt="each route of the one link typed in a laptop's browser, landing on the page it leads to"
                />
              </Fit>
            }
          />
        ),
      },
      {
        id: "vcard",
        label: "vCard",
        mark: <Contact />,
        span: 2,
        play: 0.85,
        hold: 0.94,
        content: ({ p }) => (
          <StoryCard
            title={<StoryTitle lead="easy" rest="to save" />}
            body="Your e-ID generates a vCard so people can save you as a contact."
            action={contact.save}
            overflow
            scene={
              <Fit ratio={IPHONE}>
                <Phone contact={contact} address={routes.start} at={p} />
              </Fit>
            }
          />
        ),
      },
      {
        id: "json",
        label: "for programs",
        mark: <Braces />,
        span: 1.2,
        play: 0.75,
        content: ({ p }) => (
          <StoryCard
            title={<StoryTitle lead="for programs" rest="too" />}
            body="just add /json to any profile"
            overflow
            scene={
              <Fit ratio={MACBOOK}>
                <Laptop
                  visit={laptop}
                  at={p}
                  alt="a laptop's browser at the card's data, scrolled through"
                />
              </Fit>
            }
          />
        ),
      },
      {
        id: "embed",
        label: "embed",
        mark: <Code />,
        // A still: nothing plays, so nothing to hold.
        content: () => (
          <StoryCard
            title={<StoryTitle lead="embed" rest="on your website" />}
            // The two lines to paste, beside the laptop, never over it: a long
            // line scrolls in its own block.
            action={<div className="min-w-0">{story.code}</div>}
            overflow
            scene={
              <Fit ratio={MACBOOK}>
                <Desk site={site} />
              </Fit>
            }
          />
        ),
      },
    ],
    [story, routes, laptop, contact, site],
  );
  return (
    <ScrollStory
      label="what an e-ID does"
      chapters={chapters}
      picker="labels"
      pace="110svh"
      tail="30svh"
      clear={{ top: "5.5rem", bottom: "1.5rem" }}
      overflow={OUT}
      deck={{ bleed: true }}
      // The window under the bar, less the room a device stands out by above
      // and below its card and the picker under the deck.
      className="[--card-h:clamp(28rem,calc(100svh-19rem),44rem)]"
    />
  );
}

type Story = ReturnType<typeof useStory>;

/** The story's parts: the routes' visit, the laptop's visit (the data, scrolled,
 *  then the site), every route's address and icon. */
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
    ];
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
        pages: { [data.address]: data.page },
        total: browserTimeline(data.address, laptopSteps).total,
      },
      site: siteOf(embed),
    };
  }, [username, profile, landings, contact, data, embed]);
}

/** The embed done: a site's page with the two lines in it, the script in its
 *  head and the card in its body, both marked, the caret after the card. */
function siteOf(embed: StoryProps["embed"]) {
  const [script, element, ...rest] = embed.snippet.split("\n");
  if (!script || !element || rest.length > 0)
    throw new Error(`story: the embed is not two lines: ${embed.snippet}`);
  const lines = [
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="utf-8" />',
    "    <title>my site</title>",
    `    ${script}`,
    "  </head>",
    "  <body>",
    "    <h1>hello</h1>",
    `    ${element}`,
    "  </body>",
    "</html>",
  ];
  const at = (line: string) => lines.indexOf(line) + 1;
  const card = at(`    ${element}`);
  return {
    address: embed.address,
    file: { path: "index.html", text: `${lines.join("\n")}\n` },
    highlight: `${at(`    ${script}`)},${card}`,
    caret: { line: card, column: `    ${element}`.length + 1 },
    card: embed.card,
  };
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

/** The route the browser is on: the one link, its end (`/gh`, `/web`) lit, and
 *  each route's icon, the one it is on lit, those it has been to a step brighter
 *  than those to come. */
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
    // The address, then its routes right under it: one group (16 between them),
    // the icons' glyphs on the text's left edge (each in a 40 px circle, its
    // 20 px glyph 10 px in).
    <div className="flex flex-col gap-4">
      <p className="truncate font-mono text-base">
        <span className="text-foreground/45">{home}</span>
        <span className="text-foreground">{address.slice(home.length)}</span>
      </p>
      <ol className="-ml-2.5 flex gap-1" aria-label="the one link's routes">
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

/** An iPhone's screen in points (iPhone 16 Pro, inside device-frame's bezel):
 *  what the phone's Safari is laid out at before it is scaled to the frame, so
 *  the page reads as it does on a real one. */
const PHONE_SCREEN = { width: 402, height: 842 };

/** The save, as it happens on a phone, over the chapter (`at`, 0..1): where each
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

/** The phone, through the save (`SAVE`, `at` the chapter's moment): the holder's
 *  profile in Safari, its save pressed, the contact iOS raises over it scrolled
 *  through, then saved in Contacts on the poster of its photo's colour. Down as
 *  the reader scrolls down, back as they scroll up. */
function Phone({
  contact,
  address,
  at,
}: {
  contact: StoryProps["contact"];
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
    <Screen app="Safari">
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
    </Screen>
  );
}

/** The laptop's screen, a real screen scaled whole: the desktop's wallpaper, the
 *  menu bar on it under the notch led by the app in front, as macOS 26 draws it
 *  (no bar of its own, the words on the wallpaper), and what is open under it. */
function Screen({ app, children }: { app: string; children: React.ReactNode }) {
  return (
    <MacbookFrame className={GROUND}>
      <Scaled {...SCREEN} className="w-full">
        <div className="absolute inset-0 flex flex-col">
          <Wallpaper />
          <div
            className="relative flex shrink-0 items-center gap-6 px-5 font-medium
              text-[13px] text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]"
            style={{
              height: MENU_BAR,
              fontFamily: "-apple-system, system-ui, sans-serif",
            }}
          >
            <span className="font-semibold">{app}</span>
            <span>File</span>
            <span>Edit</span>
            <span>View</span>
            <span>Window</span>
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col">
            {children}
          </div>
        </div>
      </Scaled>
    </MacbookFrame>
  );
}

/** The desktop under the windows: the site's own light (components/light), no
 *  hue, a few steps brighter than a window's ground (`GROUND`, 0.17), so the
 *  menu bar's words and the windows' edges stand off it as on a real Mac. */
function Wallpaper() {
  return (
    <div aria-hidden className="absolute inset-0">
      <AmbientLight
        ground="oklch(0.26 0 0)"
        glows={[
          {
            color: "oklch(0.5 0 0)",
            x: 0.15,
            y: 0,
            rx: 0.8,
            ry: 0.7,
            strength: 0.6,
          },
          {
            color: "oklch(0.4 0 0)",
            x: 0.95,
            y: 0.6,
            rx: 0.6,
            ry: 0.8,
            strength: 0.4,
          },
        ]}
      />
    </div>
  );
}

/** Room between the desk's windows, and round them. */
const DESK_GAP = 8;

/** The editor's width: room for the script's line, the file's longest, unwrapped
 *  (a wider screen held it with room to spare, and shrank the code past reading
 *  at the size a laptop is drawn here). */
const EDITOR_WIDTH = 592;

/** The embed done, a still (`siteOf`): the editor on the left with the site's page
 *  and the two lines in it marked, the caret blinking after the card; the browser
 *  on the right on the site, the card on it. */
function Desk({ site }: { site: Story["site"] }) {
  const window = { top: DESK_GAP, bottom: DESK_GAP };
  return (
    <Screen app="Code">
      <Ide
        project="my-site"
        files={[site.file]}
        active={site.file.path}
        highlight={site.highlight}
        caret={site.caret}
        blink
        explorer={false}
        scheme="dark"
        role="img"
        aria-label="an editor: the embed's script in the head of index.html and its card in the body, marked"
        className="absolute aspect-auto"
        style={{ ...window, left: DESK_GAP, width: EDITOR_WIDTH }}
      />
      <Browser
        url={`https://${site.address}`}
        material="glass"
        className="absolute aspect-auto"
        style={{
          ...window,
          left: DESK_GAP * 2 + EDITOR_WIDTH,
          width: SCREEN.width - DESK_GAP * 3 - EDITOR_WIDTH,
        }}
      >
        <Site card={site.card} />
      </Browser>
    </Screen>
  );
}

/** A bar standing in for a line of a site's text, as wide as `w` of its column. */
function Bone({ w, className }: { w: string; className?: string }) {
  return (
    <div
      className={cn("h-2.5 rounded-full bg-foreground/10", className)}
      style={{ width: w }}
    />
  );
}

/** Someone's own site, its words still to be written (bars standing in for them),
 *  and the one thing on it that is real: the card, embedded where it would go,
 *  between what they say of themselves. */
function Site({ card }: { card: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col gap-7 px-6 py-5">
      <header className="flex items-center justify-between">
        <div className="size-6 rounded-full bg-foreground/15" />
        <div className="flex gap-4">
          <Bone w="2rem" />
          <Bone w="2.5rem" />
          <Bone w="2rem" />
        </div>
      </header>
      <div className="flex flex-col gap-2.5">
        <Bone w="75%" className="h-5 bg-foreground/15" />
        <Bone w="50%" className="h-5 bg-foreground/15" />
      </div>
      <div className="flex flex-col gap-2.5">
        <Bone w="100%" />
        <Bone w="92%" />
        <Bone w="60%" />
      </div>
      {card}
      <div className="flex flex-col gap-2.5">
        <Bone w="96%" />
        <Bone w="88%" />
        <Bone w="40%" />
      </div>
    </div>
  );
}
