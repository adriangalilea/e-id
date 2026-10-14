import { ContactRound } from "lucide-react";
import { type Landing, LinkMap } from "@/components/landing/link-map";
import { WebPreview } from "@/components/ui/web-preview";
import { shortName } from "@/lib/place-names";
import { getWebsite } from "@/lib/presence";
import { getSocialIcon } from "@/lib/socials";
import { IdCard, type Holder } from "@/components/id-card";
import { Button } from "@/components/ui/button";
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
export async function Features({ holder }: { holder: Holder }) {
  const embed = `<script type="module" src="${PROD_URL}/embed.js"></script>\n<e-id-card handle="${holder.username}"></e-id-card>`;
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
          <Button
            material="glass"
            size="lg"
            render={
              // biome-ignore lint/a11y/useAnchorContent: the Button draws the label
              <a href={`/${holder.username}.vcf`} download={`${holder.username}.vcf`} />
            }
          >
            <ContactRound strokeWidth={1.5} />
            save contact
          </Button>
        </div>
      </Row>
      <Row
        side="left"
        title="on your website"
        body="Your card on any page with two lines: it draws itself, and its hologram answers the hand."
      >
        <Glass
          shape="surface"
          className="overflow-hidden p-1 [--glass-radius:1.25rem]"
        >
          <Code lang="html" copy>
            {embed}
          </Code>
        </Glass>
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
      const facts =
        place.platform === "email" ? null : await getWebsite(place.url);
      return {
        end: shortName(place.platform),
        // Each fills the frame it lands in (link-map), its own frame dropped.
        there: facts ? (
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
