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
import { SelectUser } from "@/db/schema";
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

export const SocialNetworkMap = {
  email: "email",
  website: "website",
  gh_username: "github",
  youtube: "youtube",
  twitter: "twitter",
  // instagram: "instagram",
  // facebook: "facebook",
  // custom_website: "custom_website",
} as const;

// Infer DbSocialKeys and SocialNetwork types from SocialNetworkMap
type DbSocialKeys = keyof typeof SocialNetworkMap;
type SocialNetwork = (typeof SocialNetworkMap)[DbSocialKeys];

// type ValidSocial = {
//   id: SocialNetwork;
//   url: string;
//   icon: string;
//   displayText: string;
// };

export function getSocialUrl(
  network: SocialNetwork,
  identifier: string,
): string {
  const baseUrlMap = {
    email: `mailto:${identifier}`,
    website: identifier,
    github: `https://github.com/${identifier}`,
    youtube: `https://youtube.com/@${identifier}`,
    twitter: `https://twitter.com/${identifier}`,
    // facebook: `https://facebook.com/${identifier}`,
    // instagram: `https://instagram.com/${identifier}`,
    // custom_website: identifier,
  };
  return baseUrlMap[network] || identifier;
}

function getSocialDisplayText(
  network: SocialNetwork,
  identifier: string,
): string {
  //network === "custom_website" ||
  if (network === "website") {
    return identifier.replace(/^https?:\/\//, "");
  }
  return `@${identifier}`;
}

function getSocialIcon(network: SocialNetwork): ReactElement {
  const iconMap = {
    website: <LinkIcon size={18} strokeWidth={1} className="opacity-80" />,
    email: <Mail size={18} strokeWidth={1} className="opacity-80" />,
    github: <Github size={18} strokeWidth={1} className="opacity-80" />,
    twitter: <Twitter size={18} strokeWidth={1} className="opacity-80" />,
    youtube: <Youtube size={18} strokeWidth={1} className="opacity-80" />,
    instagram: <Instagram size={18} strokeWidth={1} className="opacity-80" />,
    facebook: <Facebook size={18} strokeWidth={1} className="opacity-80" />,
    custom_website: (
      <LinkIcon size={18} strokeWidth={1} className="opacity-80" />
    ),
  };
  return iconMap[network];
}

type UserSocialInfo = {
  id: DbSocialKeys; // Ensure this matches the keys from SocialNetworkMap
  value: string | null | undefined; // Accommodate for the possibility of null values
};

// Adjust the ValidSocial type if necessary to ensure compatibility
type ValidSocial = {
  id: SocialNetwork;
  url: string;
  icon: string;
  displayText: string;
};
function getValidSocials(user: SelectUser): ValidSocial[] {
  console.log(user);
  // Map user properties to their respective social network identifiers.
  const mappings: Array<{ id: SocialNetwork; key: keyof SelectUser }> = [
    { id: "email", key: "email" },
    { id: "website", key: "website" },
    { id: "github", key: "gh_username" },
    { id: "youtube", key: "youtube" },
    { id: "twitter", key: "twitter" },
  ];

  return mappings.reduce<ValidSocial[]>((acc, { id, key }) => {
    const value = user[key];
    if (typeof value === "string") {
      // Ensure the value is a string to proceed.
      const url = getSocialUrl(id, value);
      const icon = getSocialIcon(id);
      const displayText = getSocialDisplayText(id, value);
      acc.push({ id, url, icon, displayText });
    }
    return acc;
  }, []);
}

export function SocialComponent({ user }: { user: SelectUser }): JSX.Element {
  const validSocials = getValidSocials(user);
  console.log(validSocials);

  return (
    <Tabs defaultValue={validSocials[0]?.id} className="w-full">
      <TabsList className="grid auto-cols-fr grid-flow-col rounded-none border-x border-t !p-0">
        {validSocials.map(({ id, icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="flex h-full justify-center rounded-none px-2"
          >
            {icon}
          </TabsTrigger>
        ))}
      </TabsList>
      {validSocials.map(({ id, url, displayText }) => (
        <TabsContent key={id} value={id} className="mt-0">
          <Card className="rounded-none border-t-transparent">
            <CardContent className="space-y-2 p-0">
              <Link href={url} className="flex items-center no-underline">
                <Button variant="ghost" className="w-full h-full rounded-none">
                  <div className="flex flex-col items-center space-y-2">
                    {displayText}
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
