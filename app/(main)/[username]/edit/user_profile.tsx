import { Input } from "@/components/ui/input";
import CountryPicker from "./country_picker";
import { SelectUser } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { updateUserAndSocials } from "@/db/actions";
import { SocialComponent } from "@/components/social_component";
import { InputQuote } from "@/components/quote";

export default function UserProfile({ user }: { user: SelectUser }) {
  const updateUserWithUser = updateUserAndSocials.bind(null, user.id);

  return (
    <form
      action={updateUserWithUser}
      className="flex flex-1 flex-col items-end gap-6"
    >
      <div className="flex flex-col">
        <div className="flex w-full items-center gap-3">
          <div className="flex flex-col justify-between gap-1.5 sm:grow sm:flex-row sm:items-end">
            <Input
              type="text"
              name="name"
              defaultValue={user.name!}
              className="!m-0 !bg-transparent text-2xl font-normal focus-visible:border-zinc-500
                focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0
                sm:font-normal"
              placeholder="Name"
            />
            <div className="flex items-center gap-1 font-extralight">
              @
              <Input
                type="text"
                name="username"
                defaultValue={user.username!}
                className="!m-0 min-w-[160px] grow !bg-transparent text-[16px]
                  focus-visible:border-zinc-500 focus-visible:ring-0
                  focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
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
        <div className="flex w-full flex-col gap-3">
          <InputQuote
            text={user.bio ?? ""}
            name="bio"
            placeholder="Message to the world"
          />
          <SocialComponent user={user} edit={true} />
        </div>
      </div>

      <Button
        type="submit"
        variant="secondary"
        className="!h-10 w-full !p-0 text-emerald-500 hover:bg-emerald-500/10"
      >
        <Save strokeWidth={1} />
      </Button>
    </form>
  );
}
