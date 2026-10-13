import Flag from "@/components/flag";
import { SocialComponent } from "@/components/social_component";
import { Quote, InputQuote } from "@/components/quote";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AtSign } from "lucide-react";
import CountryPicker from "@/components/country_picker";
import { SaveButton } from "@/components/save_button";
import { DiscardButton } from "@/components/discard_button";
import type { SelectSocial } from "@/db/schema";
import type { Profile } from "@/lib/data";
import type { ContributionDay } from "@/lib/github";
import { EditForm } from "./edit_form";

function ProfileHeader({ user, edit }: { user: Profile; edit?: boolean }) {
  return (
    <div>
      <div
        className="prose prose-zinc dark:prose-invert flex flex-col
          justify-between gap-1.5 pt-3 sm:flex-row sm:items-end sm:gap-3"
      >
        {edit ? (
          <Input
            data-1p-ignore
            type="text"
            name="name"
            defaultValue={user.name ?? ""}
            className="m-0! bg-transparent! text-2xl font-normal
              focus-visible:border-zinc-500 focus-visible:ring-0
              focus-visible:ring-transparent focus-visible:ring-offset-0
              sm:font-normal"
            placeholder="Name"
          />
        ) : (
          <h1 className="m-0! text-2xl font-light">{user.name}</h1>
        )}
        <div className="flex items-end justify-between sm:grow">
          {edit ? (
            <div className="flex items-center font-extralight">
              <Label
                htmlFor="username"
                className="flex size-10 items-center justify-center
                  bg-zinc-50/10"
              >
                <AtSign strokeWidth={1} size="20" />
              </Label>
              <Input
                data-1p-ignore
                type="text"
                id="username"
                name="username"
                defaultValue={user.username}
                className="m-0! min-w-[140px] grow border border-border
                  bg-transparent! text-[16px] focus-visible:border-zinc-500
                  focus-visible:ring-0 focus-visible:ring-transparent
                  focus-visible:ring-offset-0 sm:font-normal"
                placeholder="username"
              />
            </div>
          ) : (
            <p
              className="prose prose-zinc dark:prose-invert m-0! text-xl
                font-extralight"
            >
              @{user.username}
            </p>
          )}
          <div className="flex content-between items-start gap-1.5">
            {edit ? (
              <>
                <input
                  type="hidden"
                  name="country_code"
                  defaultValue={user.country_code}
                />
                <CountryPicker savedCountry={user.country_code} />
              </>
            ) : (
              <Flag country={user.country_code} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type ProfileProps = {
  user: Profile;
  socials: SelectSocial[];
  githubData: ContributionDay[];
  edit?: boolean;
};

function ProfileContent({ user, socials, githubData, edit }: ProfileProps) {
  return (
    <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:gap-4">
      {edit ? (
        <InputQuote
          text={user.bio ?? ""}
          name="bio"
          placeholder="Message to the world"
        />
      ) : (
        user.bio && <Quote text={user.bio} />
      )}
      <SocialComponent socials={socials} edit={edit} githubData={githubData} />
      {edit && (
        <div className="flex items-center justify-end gap-2">
          <DiscardButton username={user.username} />
          <SaveButton />
        </div>
      )}
    </div>
  );
}

export default function UserProfile(props: ProfileProps) {
  const content = (
    <main className="animate-fade-in">
      <ProfileHeader user={props.user} edit={props.edit} />
      <ProfileContent {...props} />
    </main>
  );

  if (props.edit) {
    return <EditForm>{content}</EditForm>;
  }

  return content;
}
