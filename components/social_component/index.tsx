import { TabsBox, TabsPanel, TabsTab } from "@/components/ui/tabs";
import Link from "next/link";
import type { SelectSocial } from "@/db/schema";
import type { Presence } from "@/lib/presence";
import {
  getSocialDisplayText,
  getSocialIcon,
  getSocialPlaceholder,
  getSocialPretextIcon,
  getSocialUrl,
} from "@/lib/socials";
import { InputGroup } from "@/components/ui/input";
import { Copy } from "@/components/ui/copy";
import { INSET } from "@/components/surface";
import RemoveSocialButton from "./remove_social_button";
import { InputQuote, Quote } from "../quote";

import { GithubProfileCard } from "@/components/ui/github";
import { TelegramProfile } from "@/components/ui/telegram-profile";
import { Tweet } from "@/components/ui/tweet";
import { WebPreview } from "@/components/ui/web-preview";
import { YouTube } from "@/components/ui/youtube";
import { SwitchPublic } from "./switch_public";
import AddSocialDropdownMenu from "./add_social_dropdown";
import OrderDropdown from "./order_dropdown";
import { ArrowUpRight, Star } from "lucide-react";


/** GitHub's calendar inside its profile card: square days, at no less than 8px a
 *  day (36rem for 53 weeks), the oldest weeks cut where the card is narrower and
 *  the latest kept. */
const CALENDAR =
  "[&_[data-slot=github-calendar]]:flex [&_[data-slot=github-calendar]]:flex-col [&_[data-slot=github-calendar]]:items-end [&_[data-slot=github-calendar]]:overflow-hidden [&_[data-slot=github-calendar]>figcaption]:self-start [&_[data-slot=github-calendar]>svg:first-of-type]:min-w-[36rem] [&_[data-slot=github-calendar]_rect]:[rx:0]";

/** What a social shows of the person there, from what the page read (lib/presence);
 *  nothing where there was nothing to read. */
function PresenceOf({
  social,
  presence,
}: {
  social: SelectSocial;
  presence: Presence;
}) {
  if (social.platform === "github" && presence.github)
    return (
      <GithubProfileCard
        profile={presence.github}
        className={`${INSET} ${CALENDAR}`}
      />
    );
  if (social.platform === "website" && presence.website)
    return <WebPreview facts={presence.website} className={INSET} />;
  if (social.platform === "youtube" && presence.youtube)
    return <YouTube video={presence.youtube} />;
  if (social.platform === "twitter" && presence.tweet)
    return <Tweet tweet={presence.tweet} className={INSET} />;
  if (social.platform === "telegram" && presence.telegram)
    return <TelegramProfile profile={presence.telegram} className={INSET} />;
  return null;
}

/** The way to a social, one quiet line over what it shows: the handle, opening it,
 *  and right beside it the registry's copy (@ag/copy) of what a reader takes away,
 *  the address for an email and the link for the rest. Beside, never across the
 *  line: a copy button at the far end reads as nobody's. */
function SocialLink({ social }: { social: SelectSocial }) {
  const value = social.value ?? "";
  const url = getSocialUrl(social.platform, value);
  return (
    <div className="flex min-w-0 items-center gap-1 self-start px-1">
      <Link
        href={url}
        // rel="me": this page and that profile are the same person, which
        // Mastodon and other IndieWeb readers check to mark the link verified.
        rel="me"
        className="group flex min-w-0 items-center gap-2.5 text-[15px] text-foreground/75
          transition-colors hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0"
      >
        <span className="text-foreground/45">
          {getSocialPretextIcon(social.platform)}
        </span>
        <span className="truncate">
          {getSocialDisplayText(social.platform, value)}
        </span>
        <ArrowUpRight
          strokeWidth={1.5}
          aria-hidden
          className="opacity-40 transition-[opacity,translate] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
        />
      </Link>
      <Copy
        value={social.platform === "email" ? value : url}
        className="size-9 rounded-full"
      />
    </div>
  );
}

/** A profile's socials as one @ag/tabs box: a single surface whose head is the
 *  strip of their icons (the chosen one named, `labels="active"`; on the edit form
 *  the way to add one at its end) and whose body is the person's presence there.
 *  The head pins under the site's bar (5rem, the layout's room for it) while a
 *  long panel scrolls under it. `socials` arrive filtered and ordered by the
 *  caller (lib/data): the public ones on the profile, all of them on the edit
 *  form. */
export function SocialComponent({
  socials,
  edit,
  presence,
}: {
  socials: SelectSocial[];
  edit?: boolean;
  presence: Presence;
}) {
  if (!edit && socials.length === 0) return null;

  return (
    <TabsBox
      defaultValue={socials[0]?.id}
      size="lg"
      labels="active"
      top="5rem"
      className="w-full"
      action={edit ? <AddSocialDropdownMenu /> : undefined}
      tabs={socials.map(({ id, platform }) => (
        <TabsTab key={id} value={id} icon={getSocialIcon(platform)}>
          {platform}
        </TabsTab>
      ))}
    >
      {socials.map((social, index) => {
        const value = social.value ?? "";
        const pretext = getSocialPretextIcon(social.platform);
        return (
          <TabsPanel
            key={social.id}
            value={social.id}
            className="flex flex-col gap-4"
          >
            {!edit && <SocialLink social={social} />}
            {edit && (
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-foreground/55">
                  {social.platform}
                </span>
                <div className="flex items-center gap-2">
                  <OrderDropdown
                    socialId={social.id}
                    position={index + 1}
                    count={socials.length}
                  />
                  <SwitchPublic
                    id={`${social.platform}_${social.id}_public`}
                    defaultChecked={social.public}
                    name={`${social.platform}_${social.id}_public`}
                  />
                  <RemoveSocialButton platformId={social.id} />
                </div>
              </div>
            )}
            {edit ? (
              <InputQuote
                text={social.context_message ?? ""}
                name={`${social.platform}_${social.id}_contextmessage`}
                placeholder="Optional contextual message"
              />
            ) : (
              social.context_message && <Quote text={social.context_message} />
            )}

            {/* Each field with what it is before it in the well (@ag/input):
                the place's own mark (@, a link), a star for a highlight. */}
            {edit && (
              <InputGroup
                data-1p-ignore
                type="text"
                id={social.id}
                name={`${social.platform}_${social.id}_value`}
                aria-label={social.platform}
                defaultValue={value}
                placeholder={getSocialPlaceholder(social.platform)}
                material="plain"
                size="lg"
                start={pretext}
              />
            )}
            {(social.platform === "youtube" || social.platform === "twitter") &&
              edit && (
                <InputGroup
                  data-1p-ignore
                  type="text"
                  id={`${social.platform}_${social.id}_highlight`}
                  name={`${social.platform}_${social.id}_highlight`}
                  aria-label="highlight"
                  defaultValue={social.custom_data?.["highlight"] || ""}
                  placeholder={
                    social.platform === "youtube"
                      ? "Optional highlight video ID"
                      : "Optional highlight tweet ID"
                  }
                  material="plain"
                  size="lg"
                  start={<Star strokeWidth="1" />}
                />
              )}
            <PresenceOf social={social} presence={presence} />
          </TabsPanel>
        );
      })}
    </TabsBox>
  );
}
