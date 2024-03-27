import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Cloud,
  CreditCard,
  Github,
  Keyboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  PlusCircle,
  Settings,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Plus } from "lucide-react";
import GitHubActivity from "./github_activity";

export async function SocialComponent({
  user,
  edit,
}: {
  user: SelectUser;
  edit?: boolean;
}): Promise<JSX.Element> {
  let validSocials = await getSocials(user.id);

  console.log({ validSocials });

  if (!edit) {
    // filter out non public ones
    validSocials = validSocials.filter((social) => social.public === true);

    if (validSocials.length === 0) return <></>;
  }

  const populatedSocials = validSocials.map(
    ({ platform, value, image, ...rest }) => ({
      url: getSocialUrl(platform, value),
      icon: getSocialIcon(platform),
      displayText: getSocialDisplayText(platform, value),
      platform,
      value,
      image,
      ...rest,
    }),
  );

  console.log({ populatedSocials });

  return (
    <Tabs defaultValue={populatedSocials[0]?.id} className="w-full">
      <TabsList className="grid auto-cols-fr grid-flow-col border-x border-t !p-0">
        {populatedSocials.map(({ id, icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="flex h-full justify-center px-2 !shadow-none"
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
                className="justify-center !shadow-none px-2 border-none hover:border-none hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-500 focus-visible:!ring-transparent"
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
                <DropdownMenuItem key={platform} className="flex gap-2">
                  {getSocialIcon(platform)}{" "}
                  <span className="opacity-80">{platform}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TabsList>
      {populatedSocials.map((social) => (
        <TabsContent key={social.id} value={social.id} className="mt-0">
          <Card className="border-t-transparent p-2">
            {(edit || social.context_message) && (
              <CardHeader className="flex flex-col gap-1">
                {edit ? (
                  <CardTitle>
                    <div className="flex justify-between items-center">
                      {social.platform}
                      <div className="flex gap-2">
                        <div className="flex justify-between items-center gap-1">
                          <Switch
                            id={`${social.platform}_${social.id}_public`}
                            defaultChecked={social.public}
                            name={`${social.platform}_${social.id}_public`}
                          />
                        </div>
                        <Button
                          variant="destructiveGhost"
                          className="!h-10 !w-10 !p-0 text-red-500"
                        >
                          <X />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 border-l border-zinc-500">
                      <Input
                        type="text"
                        name={`${social.platform}_${social.id}_contextmessage`}
                        defaultValue={social.context_message ?? ""}
                        className="prose prose-zinc dark:prose-invert !m-0 bg-black/5 p-2 text-[16px] italic focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 dark:bg-white/5"
                        placeholder="Optional contextual message"
                      />
                    </div>
                  </CardTitle>
                ) : social.context_message ? (
                  <CardDescription>
                    <blockquote className="prose prose-zinc dark:prose-invert border-l border-zinc-500 bg-black/5 p-2 italic dark:bg-white/5">
                      {social.context_message}
                    </blockquote>
                  </CardDescription>
                ) : (
                  <></>
                )}
              </CardHeader>
            )}

            <CardContent className="space-y-2 p-0 flex flex-col gap-2">
              {edit ? (
                <>
                  <Input
                    type="text"
                    name={`${social.platform}_${social.id}_value`}
                    defaultValue={social.value}
                    className="!m-0 min-w-[160px] grow text-[16px] focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
                    placeholder="handle"
                  />
                </>
              ) : (
                <>
                  {social.platform === "github" && user.username && (
                    <GitHubActivity username={user.username} />
                  )}
                  <Link
                    href={social.url}
                    className="flex items-center no-underline !m-0"
                  >
                    <Button variant="secondary" className="size-full ">
                      <div className="flex flex-col items-center space-y-2">
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
