import Flag from "@/components/flag";
import { SelectUser } from "@/db/schema";
import { SocialComponent } from "./social_component";

export default function UserProfile({ user }: { user: SelectUser }) {
  return (
    <main>
      <div>
        <div className="prose prose-zinc dark:prose-invert flex flex-col justify-between gap-1 pt-2 sm:flex-row sm:items-end sm:gap-3">
          <h1 className="!m-0 text-2xl font-normal sm:font-normal">
            {user.name}
          </h1>
          <div className="flex justify-between sm:grow">
            <p className="prose prose-zinc dark:prose-invert !m-0 font-extralight">
              @{user.username}
            </p>
            <div className="flex content-between items-center gap-1">
              <Flag country={user.country_code} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="mt-6">
          {user.bio && (
            <blockquote className="prose prose-zinc dark:prose-invert mb-2 border-l border-zinc-500 bg-black/5 p-2 italic dark:bg-white/5">
              {user.bio}
            </blockquote>
          )}
        </div>
        <SocialComponent user={user} />
      </div>
    </main>
  );
}
