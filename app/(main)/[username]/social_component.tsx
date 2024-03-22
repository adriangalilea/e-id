import { ReactElement } from "react";
import Link from "next/link";
import {
  Twitter,
  Facebook,
  Instagram,
  Github,
  Link as LinkIcon,
  Youtube,
} from "lucide-react";

export type SocialNetwork =
  | "twitter"
  | "facebook"
  | "instagram"
  | "github"
  | "youtube"
  | "custom_website"
  | "personal_website";

export function getSocialUrl(
  network: SocialNetwork,
  identifier: string,
): string {
  const baseUrlMap = {
    twitter: `https://twitter.com/${identifier}`,
    facebook: `https://facebook.com/${identifier}`,
    instagram: `https://instagram.com/${identifier}`,
    github: `https://github.com/${identifier}`,
    youtube: `https://youtube.com/@${identifier}`,
    custom_website: identifier,
    personal_website: identifier,
  };
  return baseUrlMap[network] || identifier;
}

function getSocialIcon(network: SocialNetwork): ReactElement {
  const iconMap = {
    twitter: <Twitter size={18} strokeWidth={1} className="opacity-80" />,
    facebook: <Facebook size={18} strokeWidth={1} className="opacity-80" />,
    instagram: <Instagram size={18} strokeWidth={1} className="opacity-80" />,
    github: <Github size={18} strokeWidth={1} className="opacity-80" />,
    youtube: <Youtube size={18} strokeWidth={1} className="opacity-80" />,
    custom_website: (
      <LinkIcon size={18} strokeWidth={1} className="opacity-80" />
    ),
    personal_website: (
      <LinkIcon size={18} strokeWidth={1} className="opacity-80" />
    ),
  };
  return iconMap[network];
}

function getSocialDisplayText(
  network: SocialNetwork,
  identifier: string,
): string {
  if (network === "custom_website" || network === "personal_website") {
    return identifier.replace(/^https?:\/\//, "");
  }
  return `@${identifier}`;
}

interface SocialComponentProps {
  network: SocialNetwork;
  identifier: string;
}

export function SocialComponent({
  network,
  identifier,
}: SocialComponentProps): JSX.Element {
  const url = getSocialUrl(network, identifier);
  const icon = getSocialIcon(network);
  const displayText = getSocialDisplayText(network, identifier);
  return (
    <div className="prose prose-zinc flex items-center gap-0.5 antialiased dark:prose-invert">
      <Link
        href={url}
        className="flex items-center gap-1 font-light no-underline"
      >
        {icon} {displayText}
      </Link>
    </div>
  );
}
