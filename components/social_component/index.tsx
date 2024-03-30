import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { SelectUser, socialPlatforms } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { getSocials } from "@/db/actions";
import {
  getSocialDisplayText,
  getSocialIcon,
  getSocialPlaceholder,
  getSocialPretextIcon,
  getSocialUrl,
} from "@/lib/socials";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import AddSocialDropdownMenuItem from "./add_social_dropdown_menu_item";
import RemoveSocialButton from "./remove_social_button";
import { YouTubeEmbed } from "@next/third-parties/google";
import { Tweet } from "react-tweet";
import { InputQuote, Quote } from "../quote";

import GitHubActivity from "@/components/github/custom";
import {
  fetchGithubActivity,
  flattenData,
} from "@/components/social_component/fetch_github_activity";
import { Label } from "../ui/label";

export async function SocialComponent({
  user,
  edit,
}: {
  user: SelectUser;
  edit?: boolean;
}): Promise<JSX.Element> {
  let validSocials = await getSocials(user.id);

  if (!edit) {
    // filter out non public ones and those with null or empty social.value
    validSocials = validSocials.filter(
      (social) => social.public === true && social.value,
    );

    if (validSocials.length === 0) return <></>;
  }

  const populatedSocials = validSocials
    .sort((a, b) => {
      const orderA = a.order === null ? Infinity : a.order;
      const orderB = b.order === null ? Infinity : b.order;
      return (orderA ?? 0) - (orderB ?? 0);
    })
    .map(({ platform, value, image, ...rest }) => {
      return {
        url: getSocialUrl(platform, value!),
        icon: getSocialIcon(platform),
        displayText: getSocialDisplayText(platform, value!),
        platform,
        value,
        image,
        placeholder: getSocialPlaceholder(platform),
        placeholder_pretext: getSocialPretextIcon(platform),
        ...rest,
      };
    });

  // fetch and flatten github data if user has github account
  let githubActivityData: {
    date: string;
    count: number;
    level: number;
  }[] = [];
  const githubSocial = populatedSocials.find(
    (social) => social.platform === "github",
  );
  if (githubSocial && githubSocial.value) {
    const data = await fetchGithubActivity(githubSocial.value);
    githubActivityData = flattenData(data);
  }

  return (
    <Tabs defaultValue={populatedSocials[0]?.id} className="mt-0 w-full">
      <TabsList className="grid auto-cols-fr grid-flow-col !p-0">
        {populatedSocials.map(({ id, icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="flex h-full justify-center !shadow-none data-[state=active]:bg-zinc-200
              data-[state=inactive]:bg-zinc-50/60 dark:data-[state=active]:bg-zinc-800
              dark:data-[state=inactive]:bg-zinc-950/60"
          >
            {icon}
          </TabsTrigger>
        ))}
        {edit && (
          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              className="focus-visible:outline-none focus-visible:!ring-0 focus-visible:!ring-transparent"
            >
              <Button
                className="justify-center border-none text-indigo-500 !shadow-none hover:border-none
                  hover:bg-indigo-500/10 hover:text-indigo-500 focus-visible:!ring-transparent"
                variant="ghost"
              >
                <Plus />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel className="text-indigo-500">
                Add Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {socialPlatforms.map((platform) => (
                <AddSocialDropdownMenuItem
                  key={platform}
                  userId={user.id}
                  platform={platform}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TabsList>
      {populatedSocials.map((social) => (
        <TabsContent key={social.id} value={social.id} className="mt-0">
          <Card className="border-t-transparent bg-zinc-200 p-3 dark:bg-zinc-800">
            <CardHeader className="mb-3 flex flex-col gap-3 p-0">
              <CardTitle className="flex items-center justify-between font-light">
                {social.platform}
                {edit && (
                  <div className="flex items-center gap-3">
                    <Switch
                      id={`${social.platform}_${social.id}_public`}
                      defaultChecked={social.public}
                      name={`${social.platform}_${social.id}_public`}
                    />
                    <RemoveSocialButton
                      userId={user.id}
                      platformId={social.id}
                    />
                  </div>
                )}
              </CardTitle>
              {edit ? (
                <CardDescription>
                  <InputQuote
                    text={social.context_message ?? ""}
                    name={`${social.platform}_${social.id}_contextmessage`}
                    placeholder="Optional contextual message"
                  />
                </CardDescription>
              ) : (
                social.context_message && (
                  <CardDescription>
                    <Quote text={social.context_message} />
                  </CardDescription>
                )
              )}
            </CardHeader>

            <CardContent className="flex flex-col gap-3 p-0">
              {edit ? (
                <div className="flex items-center font-extralight">
                  <Label
                    htmlFor={social.id}
                    className="flex size-10 items-center justify-center bg-zinc-50/10"
                  >
                    {social.placeholder_pretext}
                  </Label>
                  <Input
                    data-1p-ignore
                    type="text"
                    id={social.id}
                    name={`${social.platform}_${social.id}_value`}
                    defaultValue={social.value || ""}
                    className="!m-0 w-fit border border-border !bg-transparent text-[16px]
                      focus-visible:border-zinc-500 focus-visible:ring-0
                      focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
                    placeholder={social.placeholder!}
                  />
                </div>
              ) : (
                <>
                  {social.platform === "github" &&
                    social.value &&
                    githubActivityData && (
                      <GitHubActivity data={githubActivityData} />
                    )}
                  {social.platform === "youtube" &&
                    social.custom_data &&
                    social.custom_data["highlight"] && (
                      <YouTubeEmbed
                        videoid={social.custom_data["highlight"]}
                        params="controls=0"
                      />
                    )}
                  {social.platform === "twitter" &&
                    social.custom_data &&
                    social.custom_data["highlight"] && (
                      <div className="flex justify-center *:!m-0 *:!w-full">
                        <Tweet id={social.custom_data["highlight"]} />
                      </div>
                    )}
                  <Link
                    href={social.url}
                    className="group flex w-fit items-center border border-border font-extralight"
                  >
                    <Label
                      htmlFor={social.id}
                      className="flex size-10 items-center justify-center bg-zinc-600 text-zinc-200
                        dark:bg-zinc-300 dark:text-zinc-700"
                    >
                      {social.placeholder_pretext}
                    </Label>
                    <div
                      id={social.id}
                      className="prose prose-zinc flex flex h-10 items-center gap-2 bg-zinc-950/10 px-2
                        text-[16px] font-light transition-colors dark:prose-invert
                        group-hover:bg-zinc-600 group-hover:text-zinc-200 sm:font-normal
                        dark:bg-zinc-50/10 group-hover:dark:bg-zinc-300 group-hover:dark:text-zinc-700"
                    >
                      {social.displayText}
                    </div>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
