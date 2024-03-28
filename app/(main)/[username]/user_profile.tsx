import Flag from "@/components/flag";
import { SelectUser } from "@/db/schema";
import { SocialComponent } from "@/components/social_component";

export default function UserProfile({ user }: { user: SelectUser }) {
  return (
    <main>
      <div>
        <div
          className="prose prose-zinc flex flex-col justify-between gap-1.5 pt-3 dark:prose-invert
            sm:flex-row sm:items-end sm:gap-3"
        >
          <h1 className="!m-0 text-2xl font-normal sm:font-normal">
            {user.name}
          </h1>
          <div className="flex items-end justify-between sm:grow">
            <p className="prose prose-zinc !m-0 font-extralight dark:prose-invert">
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
            <blockquote
              className="prose prose-zinc border-l border-zinc-500 bg-black/5 px-3 py-1.5 italic
                dark:prose-invert dark:bg-white/5"
            >
              {user.bio}
            </blockquote>
          )}
        </div>
        <SocialComponent user={user} />
      </div>
    </main>
  );
}
