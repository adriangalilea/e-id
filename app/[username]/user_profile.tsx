import Flag from "@/components/flag";
import { SelectUser } from "@/db/schema";
import { SocialComponent } from "@/components/social_component";
import { Quote } from "@/components/quote";

export default function UserProfile({ user }: { user: SelectUser }) {
  return (
    <main>
      <div>
        <div
          className="prose prose-zinc flex flex-col justify-between gap-1.5 pt-3 dark:prose-invert
            sm:flex-row sm:items-end sm:gap-3"
        >
          <h1 className="!m-0 text-2xl font-light">{user.name}</h1>
          <div className="flex items-end justify-between sm:grow">
            <p className="prose prose-zinc !m-0 text-xl font-extralight opacity-90 dark:prose-invert">
              @{user.username}
            </p>
            <div className="flex content-between items-start gap-1.5">
              <Flag country={user.country_code} />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-6">
        {user.bio && <Quote text={user.bio} />}
        <SocialComponent user={user} />
      </div>
    </main>
  );
}
