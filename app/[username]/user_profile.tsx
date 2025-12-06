import Flag from "@/components/flag";
import { SocialComponent } from "@/components/social_component";
import { Quote, InputQuote } from "@/components/quote";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AtSign } from "lucide-react";
import CountryPicker from "@/components/country_picker";
import { SaveButton } from "@/components/save_button";
import { DiscardButton } from "@/components/discard_button";
import { SelectUser } from "@/db/schema";
import { EditForm } from "./edit_form";

function ProfileHeader({ user, edit }: { user: SelectUser; edit?: boolean }) {
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
            defaultValue={user.name!}
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
                defaultValue={user.username!}
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

function ProfileContent({ user, edit }: { user: SelectUser; edit?: boolean }) {
  return (
    <div className="mt-6 flex flex-col gap-6 sm:mt-12">
      {edit ? (
        <InputQuote
          text={user.bio ?? ""}
          name="bio"
          placeholder="Message to the world"
        />
      ) : (
        user.bio && (
          <div className="sm:mb-6">
            <Quote text={user.bio} />
          </div>
        )
      )}
      <SocialComponent user={user} edit={edit} />
      {edit && (
        <div className="flex items-center justify-end gap-2">
          <DiscardButton username={user.username!} />
          <SaveButton />
        </div>
      )}
    </div>
  );
}

export default async function UserProfile({
  user,
  edit,
}: {
  user: SelectUser;
  edit?: boolean;
}) {
  const content = (
    <main className="animate-fade-in">
      <ProfileHeader user={user} edit={edit} />
      <ProfileContent user={user} edit={edit} />
    </main>
  );

  if (edit) {
    return <EditForm>{content}</EditForm>;
  }

  return content;
}
