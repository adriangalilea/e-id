import Flag from "@/components/flag";
import { SelectUser } from "@/db/schema";
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
        <div className="prose prose-zinc flex flex-col justify-between gap-1 dark:prose-invert sm:flex-row sm:items-end sm:gap-3">
          <h1 className="!m-0 text-2xl font-normal sm:font-normal">
            {user.name}
          </h1>
          <div className="flex justify-between sm:grow">
            <p className="prose prose-zinc !m-0 font-extralight dark:prose-invert">
              @{user.username}
            </p>
            <div className="flex content-between items-center gap-1">
              <Flag country={user.country_code} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 pt-1">
        <div className="mt-6">
          {user.bio && (
            <blockquote className="prose prose-zinc mb-2 border-l border-zinc-500 bg-black/5 p-2 italic dark:prose-invert dark:bg-white/5">
              {user.bio}
            </blockquote>
          )}
        </div>
        {renderSocialLinks(user)}
      </div>
    </main>
  );
}
