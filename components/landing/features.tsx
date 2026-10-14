import { ContactRound } from "lucide-react";
import { Addresses } from "@/components/addresses";
import { IdCard, type Holder } from "@/components/id-card";
import { Button } from "@/components/ui/button";
import { Code } from "@/components/ui/code";
import { HoloLight } from "@/components/ui/holo";
import { Reveal } from "@/components/ui/reveal";
import { PROD_URL } from "@/lib/const";
import { cn } from "@/lib/utils";

/** WHAT A CARD DOES, under the hero, as untitled.garden shows a project's
 *  features: each a row of a few words beside the real thing (never a picture
 *  of it), the sides alternating down the page, each arriving as it scrolls in
 *  (@ag/reveal). One column on a phone: the words, then the thing. The card
 *  shown is a real one, the hero's lead (lib/data, `getShowcase`). */
export function Features({ holder }: { holder: Holder }) {
  const embed = `<script type="module" src="${PROD_URL}/embed.js"></script>\n<e-id-card handle="${holder.username}"></e-id-card>`;
  return (
    <section
      aria-label="what an e-ID does"
      className="mx-auto flex w-full max-w-5xl flex-col gap-32 px-6 py-32 sm:px-10"
    >
      <Row
        side="left"
        title="one link"
        body="Every place you are online, under one address. Each of these opens the same page."
      >
        <Addresses username={holder.username} size="lg" />
      </Row>
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
        <Code lang="html" copy>
          {embed}
        </Code>
      </Row>
    </section>
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
