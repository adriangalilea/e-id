import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import { Copy } from "@/components/ui/copy";
import { INSET, SURFACE } from "@/components/surface";
import { cn } from "@/lib/utils";
import RemoveSocialButton from "./remove_social_button";
import { InputQuote, Quote } from "../quote";

import { GithubProfileCard } from "@/components/ui/github";
import { TelegramProfile } from "@/components/ui/telegram-profile";
import { Tweet } from "@/components/ui/tweet";
import { WebPreview } from "@/components/ui/web-preview";
import { YouTube } from "@/components/ui/youtube";
import { Label } from "../ui/label";
import { SwitchPublic } from "./switch_public";
import AddSocialDropdownMenu from "./add_social_dropdown";
import OrderDropdown from "./order_dropdown";
import { ArrowUpRight, Star } from "lucide-react";

/** A row of the edit form: the field's icon in a square, the field beside it. */
const FIELD_ICON =
  "flex size-10 shrink-0 items-center justify-center border border-r-0 border-border bg-foreground/5";
const FIELD =
  "m-0! border border-border bg-transparent! text-[16px] focus-visible:border-foreground/40 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0";


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

/** The way to a social: a bordered chip that opens it, and beside it the
 *  registry's copy (@ag/copy) of what a reader takes away, the address for an
 *  email and the link for the rest. */
function SocialLink({ social }: { social: SelectSocial }) {
  const value = social.value ?? "";
  const url = getSocialUrl(social.platform, value);
  return (
    <div className="flex min-w-0 self-start">
      <Link
        href={url}
        // rel="me": this page and that profile are the same person, which
        // Mastodon and other IndieWeb readers check to mark the link verified.
        rel="me"
        className="group flex h-11 min-w-0 items-center border border-border transition-colors
          hover:border-foreground hover:bg-foreground hover:text-background"
      >
        <span
          className="grid size-11 shrink-0 place-items-center border-r border-border
            group-hover:border-background/20"
        >
          {getSocialPretextIcon(social.platform)}
        </span>
        <span className="truncate px-3 text-[15px]">
          {getSocialDisplayText(social.platform, value)}
        </span>
        <ArrowUpRight
          strokeWidth={1.5}
          aria-hidden
          className="mr-3 size-4 shrink-0 opacity-50 group-hover:opacity-100"
        />
      </Link>
      <Copy
        value={social.platform === "email" ? value : url}
        className="size-11 rounded-none border border-l-0 border-border"
      />
    </div>
  );
}

/** A profile's socials as tabs: a strip of square cells, the chosen one inverted,
 *  over a panel showing the person's presence there. `socials` arrive filtered and
 *  ordered by the caller (lib/data): the public ones on the profile, all of them on
 *  the edit form. */
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
    <Tabs defaultValue={socials[0]?.id} className={cn("w-full", SURFACE)}>
      <TabsList
        className="grid h-12 w-full auto-cols-fr grid-flow-col divide-x divide-white/10 border-b
          border-white/10 bg-black/20 p-0 text-foreground/50"
      >
        {socials.map(({ id, platform }) => (
          // The chosen tab is lifted out of the strip and lit along its foot by the
          // accent: the panel under it is its own.
          <TabsTrigger
            key={id}
            value={id}
            aria-label={platform}
            className="relative h-full gap-2 px-0 py-0 hover:bg-white/[0.04] hover:text-foreground
              data-[state=active]:bg-white/[0.07] data-[state=active]:text-foreground
              data-[state=active]:after:absolute data-[state=active]:after:inset-x-0
              data-[state=active]:after:bottom-0 data-[state=active]:after:h-0.5
              data-[state=active]:after:bg-glow data-[state=active]:after:shadow-[0_0_12px_var(--glow)]
              [&_svg]:size-[18px]"
          >
            {getSocialIcon(platform)}
            <span className="hidden font-mono text-xs xl:inline">{platform}</span>
          </TabsTrigger>
        ))}
        {edit && <AddSocialDropdownMenu />}
      </TabsList>
      {socials.map((social, index) => {
        const value = social.value ?? "";
        const pretext = getSocialPretextIcon(social.platform);
        return (
          <TabsContent
            key={social.id}
            value={social.id}
            className="mt-0 flex flex-col gap-5 p-4 sm:p-6"
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

            {edit && (
              <div className="flex items-center">
                <Label htmlFor={social.id} className={FIELD_ICON}>
                  {pretext}
                </Label>
                <Input
                  data-1p-ignore
                  type="text"
                  id={social.id}
                  name={`${social.platform}_${social.id}_value`}
                  defaultValue={value}
                  className={FIELD}
                  placeholder={getSocialPlaceholder(social.platform)}
                />
              </div>
            )}
            {(social.platform === "youtube" || social.platform === "twitter") &&
              edit && (
                <div className="flex items-center">
                  <Label
                    htmlFor={`${social.platform}_${social.id}_highlight`}
                    className={FIELD_ICON}
                  >
                    <Star strokeWidth="1" size="20" />
                  </Label>
                  <Input
                    data-1p-ignore
                    type="text"
                    id={`${social.platform}_${social.id}_highlight`}
                    name={`${social.platform}_${social.id}_highlight`}
                    defaultValue={social.custom_data?.["highlight"] || ""}
                    className={FIELD}
                    placeholder={
                      social.platform === "youtube"
                        ? "Optional highlight video ID"
                        : "Optional highlight tweet ID"
                    }
                  />
                </div>
              )}
            <PresenceOf social={social} presence={presence} />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
