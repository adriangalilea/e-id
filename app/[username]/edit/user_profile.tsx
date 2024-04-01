import { Input } from "@/components/ui/input";
import CountryPicker from "./country_picker";
import { SelectUser } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { updateUserAndSocials } from "@/db/actions";
import { SocialComponent } from "@/components/social_component";
import { InputQuote } from "@/components/quote";
import { Label } from "@/components/ui/label";
import { getSocialPretextIcon } from "@/lib/socials";

export default function UserProfile({ user }: { user: SelectUser }) {
  const updateUserWithUser = updateUserAndSocials.bind(null, user.id);

  const handle_pretext = getSocialPretextIcon("self");

  return (
    <form
      action={updateUserWithUser}
      className="flex flex-1 flex-col gap-6 pt-3"
    >
      <div className="flex flex-col">
        <div className="flex w-full items-center gap-3">
          <div className="flex flex-col justify-between gap-3 sm:grow sm:flex-row sm:items-end">
            <Input
              data-1p-ignore
              type="text"
              name="name"
              defaultValue={user.name!}
              className="!m-0 !bg-transparent text-2xl font-normal focus-visible:border-zinc-500
                focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0
                sm:font-normal"
              placeholder="Name"
            />
            <div className="flex items-center font-extralight">
              <Label
                htmlFor="username"
                className="flex size-10 items-center justify-center bg-zinc-50/10"
              >
                {handle_pretext}
              </Label>
              <Input
                data-1p-ignore
                type="text"
                id="username"
                name="username"
                defaultValue={user.username!}
                className="!m-0 min-w-[140px] grow border border-border !bg-transparent text-[16px]
                  focus-visible:border-zinc-500 focus-visible:ring-0
                  focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
                placeholder="username"
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
        <div className="mt-6 flex w-full flex-col gap-6">
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
        size="icon"
        className="self-end hover:bg-emerald-500/10 hover:text-emerald-500"
      >
        <Save strokeWidth={1} />
      </Button>
    </form>
  );
}
