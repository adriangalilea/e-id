import { Input } from "@/components/ui/input";
import CountryPicker from "./country_picker";
import { SelectUser } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { updateUserAndSocials } from "@/db/actions";
import { SocialComponent } from "@/components/social_component";

export default function UserProfile({ user }: { user: SelectUser }) {
  const updateUserWithUser = updateUserAndSocials.bind(null, user.id);

  return (
    <form
      action={updateUserWithUser}
      className="flex flex-1 flex-col items-end gap-6"
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-3 w-full">
          <div className="flex flex-col justify-between gap-1.5 sm:grow sm:flex-row sm:items-end">
            <Input
              type="text"
              name="name"
              defaultValue={user.name!}
              className="!m-0 text-2xl font-normal !bg-transparent focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
              placeholder="Name"
            />
            <div className="flex items-center gap-1 font-extralight">
              @
              <Input
                type="text"
                name="username"
                defaultValue={user.username!}
                className="!m-0 min-w-[160px] grow text-[16px] !bg-transparent focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
                placeholder="handle"
              />
            </div>
            <div className="flex content-between items-start gap-1.5">
              <input
                type="hidden"
                name="country_code"
                defaultValue={user.country_code}
              />
              <CountryPicker savedCountry={user.country_code} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <div className="mt-4 border-l border-zinc-500">
            <Input
              type="text"
              name="bio"
              defaultValue={user.bio!}
              className="prose prose-zinc dark:prose-invert !m-0 mb-3 bg-black/5 py-1.5 px-3  text-[16px] italic focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 dark:bg-white/5"
              placeholder="Message to the world..."
            />
          </div>
          <SocialComponent user={user} edit={true} />
        </div>
      </div>

      <Button
        type="submit"
        variant="secondary"
        className="!h-10 w-full text-emerald-500 hover:bg-emerald-500/10 !p-0"
      >
        <Save strokeWidth={1} />
      </Button>
    </form>
  );
}
