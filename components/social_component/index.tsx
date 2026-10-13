import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import type { SelectSocial } from "@/db/schema";
import type { GithubProfile } from "@/lib/github-data";
import type { Tweet as TweetFacts } from "@/lib/tweet-data";
import {
  getSocialDisplayText,
  getSocialIcon,
  getSocialPlaceholder,
  getSocialPretextIcon,
  getSocialUrl,
} from "@/lib/socials";
import { Input } from "@/components/ui/input";
import RemoveSocialButton from "./remove_social_button";
import { YouTubeEmbed } from "@next/third-parties/google";
import { InputQuote, Quote } from "../quote";

import { ContributionCalendar } from "@/components/ui/github";
import { Tweet } from "@/components/ui/tweet";
import { Label } from "../ui/label";
import { SwitchPublic } from "./switch_public";
import AddSocialDropdownMenu from "./add_social_dropdown";
import OrderDropdown from "./order_dropdown";
import { ArrowUpRight, Star } from "lucide-react";

/** What a profile's socials show beyond the link, read by the page from GitHub and
 *  X (lib/github, lib/tweet); null where there is none or it could not be read. */
export type SocialFacts = {
  github: GithubProfile | null;
  tweet: TweetFacts | null;
};

/** A row of the edit form: the field's icon in a square, the field beside it. */
const FIELD_ICON =
  "flex size-10 shrink-0 items-center justify-center border border-r-0 border-border bg-foreground/5";
const FIELD =
  "m-0! border border-border bg-transparent! text-[16px] focus-visible:border-foreground/40 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0";

/** A profile's socials as tabs. `socials` arrive filtered and ordered by the
 *  caller (lib/data): the public ones on the profile, all of them on the edit
 *  form. */
export function SocialComponent({
  socials,
  edit,
  facts,
}: {
  socials: SelectSocial[];
  edit?: boolean;
  facts: SocialFacts;
}) {
  if (!edit && socials.length === 0) return null;

  const populatedSocials = socials.map(
    ({ platform, value, image, ...rest }) => ({
      url: getSocialUrl(platform, value ?? ""),
      icon: getSocialIcon(platform),
      displayText: getSocialDisplayText(platform, value ?? ""),
      platform,
      value,
      image,
      placeholder: getSocialPlaceholder(platform),
      placeholder_pretext: getSocialPretextIcon(platform),
      ...rest,
    }),
  );

  return (
    <Tabs defaultValue={populatedSocials[0]?.id} className="w-full">
      <TabsList
        className="grid h-12 w-full auto-cols-fr grid-flow-col divide-x divide-border border
          border-border bg-transparent p-0 text-foreground/50"
      >
        {populatedSocials.map(({ id, icon, platform }) => (
          <TabsTrigger
            key={id}
            value={id}
            aria-label={platform}
            className="h-full px-0 py-0 transition-colors hover:bg-foreground/5
              hover:text-foreground data-[state=active]:bg-foreground
              data-[state=active]:text-background data-[state=active]:shadow-none
              [&_svg]:size-5"
          >
            {icon}
          </TabsTrigger>
        ))}
        {edit && <AddSocialDropdownMenu />}
      </TabsList>
      {populatedSocials.map((social) => (
        <TabsContent
          key={social.id}
          value={social.id}
          className="mt-0 flex flex-col gap-5 border border-t-0 border-border bg-card p-4
            sm:p-6"
        >
          <div className="flex min-h-10 items-center justify-between gap-4">
            <h3 className="font-mono text-xs text-foreground/50">
              {social.platform}
            </h3>
            {!edit && (
              <Link
                href={social.url}
                // rel="me": this page and that profile are the same person, which
                // Mastodon and other IndieWeb readers check to mark the link
                // verified.
                rel="me"
                className="group flex h-10 min-w-0 items-center border border-border
                  transition-colors hover:border-foreground hover:bg-foreground
                  hover:text-background"
              >
                <span
                  className="grid size-10 shrink-0 place-items-center border-r border-border
                    group-hover:border-background/20"
                >
                  {social.placeholder_pretext}
                </span>
                <span className="truncate px-3 text-[15px]">
                  {social.displayText}
                </span>
                <ArrowUpRight
                  strokeWidth={1.5}
                  aria-hidden
                  className="mr-3 size-4 shrink-0 opacity-50 group-hover:opacity-100"
                />
              </Link>
            )}
            {edit && (
              <div className="flex items-center gap-2">
                <OrderDropdown
                  socialId={social.id}
                  position={populatedSocials.indexOf(social) + 1}
                  count={populatedSocials.length}
                />
                <SwitchPublic
                  id={`${social.platform}_${social.id}_public`}
                  defaultChecked={social.public}
                  name={`${social.platform}_${social.id}_public`}
                />
                <RemoveSocialButton platformId={social.id} />
              </div>
            )}
          </div>
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
                {social.placeholder_pretext}
              </Label>
              <Input
                data-1p-ignore
                type="text"
                id={social.id}
                name={`${social.platform}_${social.id}_value`}
                defaultValue={social.value || ""}
                className={FIELD}
                placeholder={social.placeholder!}
              />
            </div>
          )}

          {social.platform === "github" && social.value && facts.github && (
            <ContributionCalendar
              calendar={facts.github.calendar}
              // The year at no less than 8px a day (36rem for its 53 weeks): where
              // the panel is narrower the oldest weeks are cut, fading out, and the
              // latest stay. Square days, as e-id draws everything.
              className="flex flex-col items-end overflow-hidden text-foreground/60
                [&_rect]:[rx:0] [&>figcaption]:self-start [&>svg]:min-w-[36rem]
                max-md:[&>svg]:mask-[linear-gradient(to_right,transparent,black_3rem)]"
            />
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
          {social.platform === "youtube" && social.custom_data?.["highlight"] && (
            <YouTubeEmbed
              videoid={social.custom_data["highlight"]}
              params="controls=0"
            />
          )}
          {social.platform === "twitter" && facts.tweet && (
            <Tweet tweet={facts.tweet} className="bg-background" />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
