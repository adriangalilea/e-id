import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GitHubCalendar from "react-github-calendar";
import Link from "next/link";
import { SelectUser } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { getSocials } from "@/db/actions";
import {
  getSocialDisplayText,
  getSocialIcon,
  getSocialUrl,
} from "@/lib/socials";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";

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
      <TabsList className="grid auto-cols-fr grid-flow-col rounded-none border-x border-t !p-0">
        {populatedSocials.map(({ id, icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="flex h-full justify-center rounded-none px-2 !shadow-none"
          >
            {icon}
          </TabsTrigger>
        ))}
      </TabsList>
      {populatedSocials.map((social) => (
        <TabsContent key={social.id} value={social.id} className="mt-0">
          <Card className="rounded-none border-t-transparent">
            <CardHeader className="p-2 flex flex-col gap-2">
              <CardTitle>{social.platform}</CardTitle>
              <CardDescription>
                <blockquote className="prose prose-zinc dark:prose-invert mb-2 border-l border-zinc-500 bg-black/5 p-2 italic dark:bg-white/5">
                  {social.context_message}
                </blockquote>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-2 pb-2 flex flex-col gap-2">
              {edit ? (
                <>
                  Visibility
                  <Switch
                    defaultChecked={social.public}
                    name={`${social.platform}_${social.id}_public`}
                  />
                  Username(handle)
                  <Input
                    type="text"
                    name={`${social.platform}_${social.id}_value`}
                    defaultValue={social.value}
                    className="!m-0 min-w-[160px] grow rounded-none text-[16px] focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
                    placeholder="handle"
                  />
                  Optional contextual Message
                  <Input
                    type="text"
                    name={`${social.platform}_${social.id}_contextmessage`}
                    defaultValue={social.context_message!}
                    className="!m-0 min-w-[160px] grow rounded-none text-[16px] focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
                    placeholder="Optional contextual message"
                  />
                </>
              ) : (
                <>
                  <Link
                    href={social.url}
                    className="flex items-center no-underline"
                  >
                    <Button
                      variant="secondary"
                      className="size-full rounded-none"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        {social.displayText}
                      </div>
                    </Button>
                  </Link>
                  {social.platform === "github" && user.username && (
                    <GitHubCalendar username={user.username} />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
