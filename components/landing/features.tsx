import { SaveContact } from "@/components/save-contact";
import { type Landing, LinkMap } from "@/components/landing/link-map";
import { WebPreview } from "@/components/ui/web-preview";
import { shortName } from "@/lib/place-names";
import { cacheLife } from "next/cache";
import { getShowcase } from "@/lib/data";
import { getWebsite } from "@/lib/presence";
import { getSocialIcon } from "@/lib/socials";
import { IdCard, type Holder } from "@/components/id-card";
import { Code } from "@/components/ui/code";
import { Glass } from "@/components/ui/material-glass";
import { HoloLight } from "@/components/ui/holo";
import { Reveal } from "@/components/ui/reveal";
import { PROD_URL } from "@/lib/const";
import { cn } from "@/lib/utils";

/** WHAT A CARD DOES, under the hero, as untitled.garden shows a project's
 *  features: each a row of a few words beside the real thing (never a picture
 *  of it), the sides alternating down the page, each arriving as it scrolls in
 *  (@ag/reveal). One column on a phone: the words, then the thing. The card
 *  shown is a real one, the hero's lead (lib/data, `getShowcase`). */
export async function Features() {
  // The card the features show: the hero's lead, a real one.
  const [first] = await getShowcase();
  if (!first) throw new Error("the home has no card to show");
  const holder: Holder = {
    name: first.name,
    username: first.username,
    image: first.image,
    country: first.country_code,
    bio: first.bio,
    places: first.places,
  };
  const landings = await landingsOf(holder);
  return (
    <section
      aria-label="what an e-ID does"
      className="mx-auto flex w-full max-w-5xl flex-col gap-32 px-6 py-32 sm:px-10"
    >
      {/* One link: the address, and every place it reaches, drawn. */}
      <Reveal as="article" className="flex flex-col items-center gap-14">
        <h2 className="text-3xl font-light tracking-[-0.02em] text-foreground/90">
          one link
        </h2>
        <div className="w-full">
          <LinkMap username={holder.username} landings={landings} />
        </div>
      </Reveal>
      <Row
        side="right"
        title="a contact in one tap"
        body="Your card saves to a phone as a contact: photo, name, address and every place. Try it."
      >
        <div className="flex flex-col items-start gap-6">
          <HoloLight className="w-full">
            <IdCard holder={holder} heading="p" holo="laminate" className="[--id-card-thickness:1]" />
          </HoloLight>
          <SaveContact username={holder.username} />
        </div>
      </Row>
      <Row
        side="left"
        title="on your website"
        body="Your card on any page with two lines: it draws itself, and its hologram answers the hand."
      >
        <EmbedSnippet username={holder.username} />
      </Row>
    </section>
  );
}

/** Where each of the holder's addresses lands, drawn: the bare address on their
 *  card, small; each place (the first of each kind, as the redirect takes it)
 *  on its own page's preview (@ag/web-preview, the unfurl the profile uses),
 *  or, where nothing can be unfurled (an email), its address with its mark. */
async function landingsOf(holder: Holder): Promise<Landing[]> {
  const places = holder.places ?? [];
  const first = places.filter(
    (p, i) => places.findIndex((q) => q.platform === p.platform) === i,
  );
  const there = await Promise.all(
    first.map(async (place): Promise<Landing> => {
      // An email has no page to unfurl, and a YouTube channel none YouTube will
      // describe (its oEmbed is for videos only): both the plain panel.
      const plain =
        place.platform === "email" ||
        (place.platform === "youtube" &&
          !/youtu\.be\/|\/watch\?|\/shorts\//.test(place.url));
      const facts = plain ? null : await getWebsite(place.url);
      return {
        end: shortName(place.platform),
        // In glass, as every container on the page: the preview's own frame
        // dropped for it.
        there: (
          <Glass
            shape="surface"
            className="overflow-hidden [--glass-radius:1.25rem]"
          >
            {facts ? (
              <WebPreview
                facts={facts}
                className="rounded-none border-0 bg-transparent shadow-none"
              />
            ) : (
              <a
                href={place.url}
                className="flex items-center justify-center gap-3 px-6 py-10 font-mono text-sm text-foreground/70 hover:text-foreground [&_svg]:size-5"
              >
                {getSocialIcon(place.platform)}
                {place.url.replace(/^(https?:\/\/|mailto:)(www\.)?/, "")}
              </a>
            )}
          </Glass>
        ),
      };
    }),
  );
  return [
    {
      end: null,
      there: (
        <HoloLight className="w-full">
          <IdCard
            holder={holder}
            heading="p"
            holo="laminate"
            className="[--id-card-thickness:1]"
          />
        </HoloLight>
      ),
    },
    ...there,
  ];
}

/** The embed's two lines for `username`, highlighted (@ag/code, in glass).
 *  Cached: the highlighter reads the clock as it works, which a page being
 *  prerendered may not, and the snippet only changes with the handle. */
async function EmbedSnippet({ username }: { username: string }) {
  "use cache";
  cacheLife("max");
  const embed = `<script type="module" src="${PROD_URL}/embed.js"></script>\n<e-id-card handle="${username}"></e-id-card>`;
  return (
    <Code lang="html" copy material="glass">
      {embed}
    </Code>
  );
}

/** One feature: its title and words on one side, the thing on the other. */
function Row({
  side,
  title,
  body,
  children,
}: {
  side: "left" | "right";
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal
      as="article"
      className={cn(
        "grid grid-cols-1 items-center gap-x-16 gap-y-8",
        side === "left"
          ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          : "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]",
      )}
    >
      <div className={cn("flex flex-col gap-3", side === "right" && "lg:order-2")}>
        <h2 className="text-3xl font-light tracking-[-0.02em] text-foreground/90">
          {title}
        </h2>
        <p className="text-lg leading-relaxed font-light text-balance text-foreground/55">
          {body}
        </p>
      </div>
      <div className="min-w-0">{children}</div>
    </Reveal>
  );
}
