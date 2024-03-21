import Flag from "@/components/flag";
import { Separator } from "@/components/ui/separator";
import { SelectUser } from "@/db/schema";
import { MapPin } from "lucide-react";
import { SocialComponent } from "./social_component";
import { type SocialNetwork } from "./social_component";

function renderSocialLinks(user: SelectUser) {
  const socialNetworks = [
    { key: "github", value: user.gh_username, network: "github" },
    { key: "twitter", value: user.twitter, network: "twitter" },
    { key: "website", value: user.website, network: "personal_website" },
    { key: "youtube", value: user.youtube, network: "youtube" },
  ];

  return socialNetworks
    .filter(
      (social): social is { key: string; value: string; network: string } =>
        !!social.value,
    )
    .map((social) =>
      SocialComponent({
        network: social.network as SocialNetwork,
        identifier: social.value,
      }),
    );
}

export default function UserProfile({ user }: { user: SelectUser }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <p>👤 {user.name}</p>
          <p className="font-extralight opacity-70">@{user.username}</p>
        </div>
        <div className="flex gap-0.5 items-center">
          <MapPin size={18} strokeWidth={1} className="opacity-80" />
          <Flag country={user.country_code} />
        </div>
      </div>
      <Separator />
      <div className="flex flex-col gap-2 p-2">
        <p className="prose prose-zinc dark:prose-invert antialiased">
          {user.bio}
        </p>
        {renderSocialLinks(user)}
      </div>
    </div>
  );
}
