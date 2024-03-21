import { ReactElement } from "react";
import Link from "next/link";
import {
  Twitter,
  Facebook,
  Instagram,
  Github,
  Link as LinkIcon,
} from "lucide-react";

type SocialNetwork =
  | "twitter"
  | "facebook"
  | "instagram"
  | "github"
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
    <div className="flex gap-0.5 items-center prose prose-zinc dark:prose-invert antialiased">
      <Link
        href={url}
        className="no-underline flex items-center gap-1 font-light"
      >
        {icon} {displayText}
      </Link>
    </div>
  );
}
