import { ReactElement } from "react";
import {
  Twitter,
  Facebook,
  Instagram,
  Github,
  Link,
  Youtube,
  Mail,
  Send,
  CircleDotDashed,
  LinkIcon,
  AtSign,
} from "lucide-react";
import { SocialPlatform } from "@/db/schema";

export function getSocialUrl(platform: SocialPlatform, id: string): string {
  const baseUrlMap: { [key in SocialPlatform]: string } = {
    email: `mailto:${id}`,
    website: id,
    github: `https://github.com/${id}`,
    youtube: `https://youtube.com/@${id}`,
    twitter: `https://twitter.com/${id}`,
    telegram: `https://t.me/${id}`,
    self: `https://${id}.self.fm`,
    instagram: `https://instagram.com/${id}`,
  };
  return baseUrlMap[platform] || id;
}

export function getSocialDisplayText(
  platform: SocialPlatform,
  id: string,
): string {
  if (platform === "website" && id) {
    return id.replace(/^https?:\/\//, "");
  }
  return id;
  // if (platform === "email") {
  //   return id;
  // }
  // return `@${id}`;
}
const iconProps = { size: 18, strokeWidth: 1, className: "opacity-80" };

export function getSocialIcon(platform: SocialPlatform): ReactElement {
  const iconMap: { [key in SocialPlatform]: ReactElement } = {
    website: <Link {...iconProps} />,
    email: <Mail {...iconProps} />,
    github: <Github {...iconProps} />,
    twitter: <Twitter {...iconProps} />,
    youtube: <Youtube {...iconProps} />,
    instagram: <Instagram {...iconProps} />,
    self: <CircleDotDashed {...iconProps} />,
    telegram: <Send {...iconProps} />,
  };

  return iconMap[platform];
}

export function getSocialPlaceholder(platform: SocialPlatform): string {
  if (platform === "email") {
    return "email";
  }
  if (platform === "website") {
    return "url";
  }
  return "username";
}

export function getSocialPretextIcon(platform: SocialPlatform): ReactElement {
  if (platform === "email") {
    return <Mail {...iconProps} />;
  }
  if (platform === "website") {
    return <LinkIcon {...iconProps} />;
  }
  return <AtSign {...iconProps} />;
}
