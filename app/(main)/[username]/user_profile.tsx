import Flag from "@/components/flag";
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
    <main>
      <div>
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-1 sm:gap-3 prose prose-zinc dark:prose-invert">
          <h1 className="font-normal sm:font-normal text-2xl !m-0">
            {user.name}
          </h1>
          <div className="flex justify-between sm:grow">
            <p className="font-extralight !m-0 opacity-70 prose prose-zinc dark:prose-invert">
              @{user.username}
            </p>
            <div className="flex content-between gap-1 items-center">
              <MapPin size={18} strokeWidth={1} className="opacity-80" />
              <Flag country={user.country_code} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 pt-1 sm:px-2">
        {user.bio && (
          <blockquote className="prose prose-zinc dark:prose-invert dark:bg-white/10 bg-black/10 px-2 py-2 italic mb-2">
            {user.bio}
          </blockquote>
        )}
        {renderSocialLinks(user)}
      </div>
    </main>
  );
}
