import Flag from "@/components/flag";
import { SelectUser } from "@/db/schema";
import { SocialComponent } from "@/components/social_component";

export default function UserProfile({ user }: { user: SelectUser }) {
  return (
    <main>
      <div>
        <div className="prose prose-zinc dark:prose-invert flex flex-col justify-between gap-1.5 pt-3 sm:flex-row sm:items-end sm:gap-3">
          <h1 className="!m-0 text-2xl font-normal sm:font-normal">
            {user.name}
          </h1>
          <div className="flex items-end justify-between sm:grow">
            <p className="prose prose-zinc dark:prose-invert !m-0 font-extralight">
              @{user.username}
            </p>
            <div className="flex content-between items-start gap-1.5">
              <Flag country={user.country_code} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="mt-3">
          {user.bio && (
            <blockquote className="prose prose-zinc dark:prose-invert border-l border-zinc-500 bg-black/5 py-1.5 px-3 italic dark:bg-white/5">
              {user.bio}
            </blockquote>
          )}
        </div>
        <SocialComponent user={user} />
      </div>
    </main>
  );
}
