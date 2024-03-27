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
  getSocialUrl,
} from "@/lib/socials";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import GitHubActivity from "@/components/social_component/github_activity";
import AddSocialDropdownMenuItem from "./add_social_dropdown_menu_item";
import RemoveSocialButton from "./remove_social_button";
import { YouTubeEmbed } from "@next/third-parties/google";
import { Tweet } from "react-tweet";

export async function SocialComponent({
  user,
  edit,
}: {
  user: SelectUser;
  edit?: boolean;
}): Promise<JSX.Element> {
  let validSocials = await getSocials(user.id);

  // console.log({ validSocials });

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
    .map(({ platform, value, image, ...rest }) => ({
      url: getSocialUrl(platform, value!),
      icon: getSocialIcon(platform),
      displayText: getSocialDisplayText(platform, value!),
      platform,
      value,
      image,
      ...rest,
    }));

  // console.log({ populatedSocials });

  return (
    <Tabs defaultValue={populatedSocials[0]?.id} className="w-full mt-0">
      <TabsList className="grid auto-cols-fr grid-flow-col border-x border-t !p-0">
        {populatedSocials.map(({ id, icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="flex h-full justify-center !shadow-none"
          >
            {icon}
          </TabsTrigger>
        ))}
        {edit && (
          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              className="focus-visible:outline-none focus-visible:!ring-transparent focus-visible:!ring-0"
            >
              <Button
                className="justify-center !shadow-none border-none hover:border-none hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-500 focus-visible:!ring-transparent"
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
          <Card className="border-t-transparent px-3 py-1.5">
            {(edit || social.context_message) && (
              <CardHeader className="flex flex-col p-0 gap-1.5 mb-1.5">
                {edit ? (
                  <CardTitle>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <div className="flex justify-between items-center gap-1">
                          <Switch
                            id={`${social.platform}_${social.id}_public`}
                            defaultChecked={social.public}
                            name={`${social.platform}_${social.id}_public`}
                          />
                        </div>
                        <span className="font-light">{social.platform}</span>
                      </div>
                      <RemoveSocialButton
                        userId={user.id}
                        platformId={social.id}
                      />
                    </div>
                    <div className="mt-3 border-l border-zinc-500">
                      <Input
                        type="text"
                        name={`${social.platform}_${social.id}_contextmessage`}
                        defaultValue={social.context_message ?? ""}
                        className="prose prose-zinc font-light dark:prose-invert !m-0 bg-black/5 px-3 py-1.5 text-[16px] italic focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 dark:bg-white/5"
                        placeholder="Optional contextual message"
                      />
                    </div>
                  </CardTitle>
                ) : social.context_message ? (
                  <CardDescription>
                    <blockquote className="prose prose-zinc dark:prose-invert border-l border-zinc-500 bg-black/5  px-3 py-1.5 italic dark:bg-white/5">
                      {social.context_message}
                    </blockquote>
                  </CardDescription>
                ) : (
                  <></>
                )}
              </CardHeader>
            )}

            <CardContent className="p-0 flex flex-col gap-1.5">
              {edit ? (
                <>
                  <Input
                    type="text"
                    name={`${social.platform}_${social.id}_value`}
                    defaultValue={social.value || ""}
                    className="!m-0 min-w-[160px] !bg-transparent grow text-[16px] focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
                    placeholder="handle"
                  />
                </>
              ) : (
                <>
                  {social.platform === "github" && user.username && (
                    <GitHubActivity username={user.username} />
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
                      <div className="flex justify-center">
                        <Tweet id={social.custom_data["highlight"]} />
                      </div>
                    )}
                  <Link
                    href={social.url}
                    className="flex items-center no-underline !m-0"
                  >
                    <Button variant="secondary" className="size-full">
                      <div className="flex flex-col items-center !py-3 font-light opacity-80">
                        {social.displayText}
                      </div>
                    </Button>
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
