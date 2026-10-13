import { SocialComponent, type SocialFacts } from "@/components/social_component";
import { Quote, InputQuote } from "@/components/quote";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AtSign } from "lucide-react";
import CountryPicker from "@/components/country_picker";
import { CountryCode, countryName } from "@/components/country";
import { EmojiDomain } from "@/components/brand";
import { SaveButton } from "@/components/save_button";
import { DiscardButton } from "@/components/discard_button";
import type { SelectSocial } from "@/db/schema";
import type { Profile } from "@/lib/data";
import { EditForm } from "./edit_form";

const FIELD =
  "m-0! border border-border bg-transparent! focus-visible:border-foreground/40 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0";

/** The face, square: the avatar GitHub gave, or the handle's first letters. */
function Face({ user }: { user: Profile }) {
  return (
    <div className="grid size-20 shrink-0 place-items-center overflow-hidden border border-border bg-card sm:size-24">
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- GitHub's avatar service, a fixed small size
        <img
          src={user.image}
          alt=""
          className="size-full object-cover grayscale-[0.15]"
        />
      ) : (
        <span className="font-mono text-2xl text-foreground/50">
          {user.username.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function ProfileHeader({ user }: { user: Profile }) {
  const country = countryName(user.country_code);
  return (
    <header className="flex flex-col gap-6">
      <div className="flex items-end gap-5 sm:gap-6">
        <Face user={user} />
        <div className="flex min-w-0 flex-col gap-2 pb-1">
          <h1 className="text-[clamp(2rem,7vw,3.25rem)] leading-[0.95] font-medium tracking-[-0.035em] text-balance">
            {user.name || `@${user.username}`}
          </h1>
          <p className="truncate font-mono text-sm text-foreground/55">
            @{user.username}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border py-3 text-sm text-foreground/60">
        <span className="flex items-center gap-2">
          <CountryCode country={user.country_code} />
          {country && <span>{country}</span>}
        </span>
        <span className="ml-auto font-mono text-xs">
          <EmojiDomain path={`/${user.username}`} />
        </span>
      </div>
    </header>
  );
}

function ProfileHeaderEdit({ user }: { user: Profile }) {
  return (
    <header className="flex flex-col gap-3">
      <Input
        data-1p-ignore
        type="text"
        name="name"
        defaultValue={user.name ?? ""}
        className={`${FIELD} h-14 text-3xl font-medium tracking-tight`}
        placeholder="Name"
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 grow items-center">
          <Label
            htmlFor="username"
            className="flex size-10 shrink-0 items-center justify-center border border-r-0 border-border bg-foreground/5"
          >
            <AtSign strokeWidth={1} size="20" />
          </Label>
          <Input
            data-1p-ignore
            type="text"
            id="username"
            name="username"
            defaultValue={user.username}
            className={`${FIELD} min-w-[140px] grow font-mono text-[16px]`}
            placeholder="username"
          />
        </div>
        <input
          type="hidden"
          name="country_code"
          defaultValue={user.country_code}
        />
        <CountryPicker savedCountry={user.country_code} />
      </div>
    </header>
  );
}

type ProfileProps = {
  user: Profile;
  socials: SelectSocial[];
  facts: SocialFacts;
  edit?: boolean;
};

export default function UserProfile({ user, socials, facts, edit }: ProfileProps) {
  const content = (
    <main className="flex animate-fade-in flex-col gap-10 sm:gap-12">
      {edit ? <ProfileHeaderEdit user={user} /> : <ProfileHeader user={user} />}
      {edit ? (
        <InputQuote
          text={user.bio ?? ""}
          name="bio"
          placeholder="Message to the world"
        />
      ) : (
        user.bio && <Quote text={user.bio} size="lead" />
      )}
      <SocialComponent socials={socials} edit={edit} facts={facts} />
      {edit && (
        <div className="flex items-center justify-end gap-2">
          <DiscardButton username={user.username} />
          <SaveButton />
        </div>
      )}
    </main>
  );

  if (edit) {
    return <EditForm>{content}</EditForm>;
  }

  return content;
}
