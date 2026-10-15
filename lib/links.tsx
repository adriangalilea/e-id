import { AtSign, CircleDotDashed, Link, Link2, Mail, Send } from "lucide-react"
import type { ReactElement } from "react"
import { Github, Instagram, XLogo, Youtube } from "@/lib/brand-icons"
import type { LinkPlatform } from "@/lib/platforms"

// A LINK BY ITS PLATFORM: where its value leads, the glyph it is drawn with, and
// what its field asks for. A platform's value is a username there, except where
// the platform takes a whole address (an email, a website, a `link`).

export function getLinkUrl(platform: LinkPlatform, value: string): string {
  const urls: { [key in LinkPlatform]: string } = {
    email: `mailto:${value}`,
    website: value,
    link: value,
    github: `https://github.com/${value}`,
    youtube: `https://youtube.com/@${value}`,
    twitter: `https://x.com/${value}`,
    telegram: `https://t.me/${value}`,
    self: `https://${value}.self.fm`,
    instagram: `https://instagram.com/${value}`,
  }
  return urls[platform]
}

/** A link's value as it is read on a profile: an address without its scheme. */
export function getLinkDisplayText(
  platform: LinkPlatform,
  value: string,
): string {
  if ((platform === "website" || platform === "link") && value)
    return value.replace(/^https?:\/\//, "")
  return value
}

const iconProps = { strokeWidth: 1 }

export function getLinkIcon(platform: LinkPlatform): ReactElement {
  const icons: { [key in LinkPlatform]: ReactElement } = {
    website: <Link {...iconProps} />,
    link: <Link2 {...iconProps} />,
    email: <Mail {...iconProps} />,
    github: <Github {...iconProps} />,
    twitter: <XLogo {...iconProps} />,
    youtube: <Youtube {...iconProps} />,
    instagram: <Instagram {...iconProps} />,
    self: <CircleDotDashed {...iconProps} />,
    telegram: <Send {...iconProps} />,
  }
  return icons[platform]
}

export function getLinkPlaceholder(platform: LinkPlatform): string {
  if (platform === "email") return "email"
  if (platform === "website" || platform === "link") return "url"
  return "username"
}

export function getLinkPretextIcon(platform: LinkPlatform): ReactElement {
  if (platform === "email") return <Mail {...iconProps} size="20" />
  if (platform === "website" || platform === "link")
    return <Link {...iconProps} size="20" />
  return <AtSign {...iconProps} size="20" />
}
