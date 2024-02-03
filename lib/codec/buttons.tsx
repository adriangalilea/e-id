import {
  Mail,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Globe,
  Hash,
  Send,
} from "lucide-react";

export const keyToIconAndUrl: Record<
  string,
  { icon: JSX.Element; url: (value: string) => string }
> = {
  email: {
    icon: (
      <Mail
        strokeWidth={1}
        className="size-12 text-indigo-500  group-hover:text-indigo-400 dark:group-hover:text-indigo-400
transition-all ease-in-out duration-500"
      />
    ),
    url: (value: string) => `mailto:${value}`,
  },
  personalSite: {
    icon: (
      <Globe
        strokeWidth={1}
        className="size-12 text-indigo-500  group-hover:text-indigo-400 dark:group-hover:text-indigo-400 transition-all ease-in-out duration-500"
      />
    ),
    url: (value: string) => value,
  },
  telegramHandle: {
    icon: (
      <Send
        strokeWidth={1}
        className="size-12 text-indigo-500 group-hover:text-indigo-400 dark:group-hover:text-indigo-400
transition-all ease-in-out duration-500"
      />
    ),
    url: (value: string) => `https://t.me/${value}`,
  },
  twitterHandle: {
    icon: (
      <Twitter
        strokeWidth={1}
        className="size-12 text-indigo-500  group-hover:text-indigo-400 dark:group-hover:text-indigo-400
transition-all ease-in-out duration-500"
      />
    ),
    url: (value: string) => `https://twitter.com/${value}`,
  },
  instagramHandle: {
    icon: (
      <Instagram
        strokeWidth={1}
        className="size-12 text-indigo-500  group-hover:text-indigo-400 dark:group-hover:text-indigo-400
transition-all ease-in-out duration-500"
      />
    ),
    url: (value: string) => `https://instagram.com/${value}`,
  },
  facebookHandle: {
    icon: (
      <Facebook
        strokeWidth={1}
        className="size-12 text-indigo-500  group-hover:text-indigo-400 dark:group-hover:text-indigo-400
transition-all ease-in-out duration-500"
      />
    ),
    url: (value: string) => `https://facebook.com/${value}`,
  },
  linkedInHandle: {
    icon: (
      <Linkedin
        strokeWidth={1}
        className="size-12 text-indigo-500  group-hover:text-indigo-400 dark:group-hover:text-indigo-400
transition-all ease-in-out duration-500"
      />
    ),
    url: (value: string) => `https://linkedin.com/in/${value}`,
  },
  other: {
    icon: (
      <Hash
        className="size-12 text-indigo-500  group-hover:text-indigo-400 dark:group-hover:text-indigo-400
transition-all ease-in-out duration-500"
      />
    ),
    url: (value: string) => value, // Assuming 'other' is an array of URLs or similar
  },
};
