import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ReactElement } from "react";
import Link from "next/link";
import { SelectSocial, SelectUser, socials } from "@/db/schema";
import {
  Twitter,
  Facebook,
  Instagram,
  Github,
  Link as LinkIcon,
  Youtube,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { eq } from "drizzle-orm";

export function getSocialUrl(
  platform: SelectSocial["platform"],
  id: string,
): string {
  const baseUrlMap = {
    email: `mailto:${id}`,
    website: id,
    github: `https://github.com/${id}`,
    youtube: `https://youtube.com/@${id}`,
    twitter: `https://twitter.com/${id}`,
    telegram: `https://t.me/${id}`,
    google: `mailto:${id}`,
    self: `https://${id}.self.fm`,
    instagram: `https://instagram.com/${id}`,
  };
  return baseUrlMap[platform] || id;
}

function getSocialDisplayText(
  platform: SelectSocial["platform"],
  id: string,
): string {
  //platform === "custom_website" ||
  if (platform === "website") {
    return id.replace(/^https?:\/\//, "");
  }
  if (platform === "email") {
    return id;
  }
  return `@${id}`;
}

function getSocialIcon(platform: SelectSocial["platform"]): ReactElement {
  const iconMap = {
    website: <LinkIcon size={18} strokeWidth={1} className="opacity-80" />,
    email: <Mail size={18} strokeWidth={1} className="opacity-80" />,
    github: <Github size={18} strokeWidth={1} className="opacity-80" />,
    twitter: <Twitter size={18} strokeWidth={1} className="opacity-80" />,
    youtube: <Youtube size={18} strokeWidth={1} className="opacity-80" />,
    instagram: <Instagram size={18} strokeWidth={1} className="opacity-80" />,
    facebook: <Facebook size={18} strokeWidth={1} className="opacity-80" />,
    google: <></>,
    self: <></>,
    telegram: <></>,
  };
  return iconMap[platform];
}

async function getSocials(userId: SelectUser["id"]): Promise<SelectSocial[]> {
  "use server";
  const totalSocials = await db
    .select()
    .from(socials)
    .where(eq(socials.user_id, userId));

  return totalSocials;
}

export async function SocialComponent({
  user,
}: {
  user: SelectUser;
}): Promise<JSX.Element> {
  const validSocials = await getSocials(user.id);
  console.log(validSocials);

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
            <CardHeader>
              <CardTitle>{social.platform}</CardTitle>
              <CardDescription>{social.context_message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-0">
              <Link
                href={social.url}
                className="flex items-center no-underline"
              >
                <Button variant="ghost" className="size-full rounded-none">
                  <div className="flex flex-col items-center space-y-2">
                    {social.displayText}
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
