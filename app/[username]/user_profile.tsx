import { SocialComponent } from "@/components/social_component";
import { InputQuote } from "@/components/quote";
import { IdCard } from "@/components/id-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AtSign } from "lucide-react";
import CountryPicker from "@/components/country_picker";
import { SaveButton } from "@/components/save_button";
import { DiscardButton } from "@/components/discard_button";
import type { SelectSocial } from "@/db/schema";
import type { Profile } from "@/lib/data";
import type { Presence } from "@/lib/presence";
import { EditForm } from "./edit_form";

const FIELD =
  "m-0! border border-border bg-transparent! focus-visible:border-foreground/40 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0";

/** The face on the edit form, square: the avatar GitHub gave, or the handle's
 *  first letters. */
function Face({ user }: { user: Profile }) {
  return (
    <div className="grid size-28 shrink-0 place-items-center overflow-hidden border border-border bg-card">
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- GitHub's avatar service
        <img src={user.image} alt="" className="size-full object-cover" />
      ) : (
        <span className="font-mono text-3xl text-foreground/45">
          {user.username.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

/** Who this is, as their e-id card. Pinned beside the places on a wide screen, the
 *  page's head on a phone. */
function Identity({
  user,
  actions,
}: {
  user: Profile;
  actions?: React.ReactNode;
}) {
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-10 lg:self-start">
      <IdCard
        holder={{
          name: user.name,
          username: user.username,
          image: user.image,
          country: user.country_code,
          bio: user.bio,
        }}
      />
      {actions}
    </aside>
  );
}

function IdentityEdit({ user }: { user: Profile }) {
  return (
    <aside className="flex flex-col gap-3 lg:sticky lg:top-10 lg:self-start">
      <Face user={user} />
      <Input
        data-1p-ignore
        type="text"
        name="name"
        defaultValue={user.name ?? ""}
        className={`${FIELD} h-12 text-2xl font-medium tracking-tight`}
        placeholder="Name"
      />
      <div className="flex min-w-0 items-center">
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
          className={`${FIELD} min-w-0 grow font-mono text-[16px]`}
          placeholder="username"
        />
      </div>
      <input type="hidden" name="country_code" defaultValue={user.country_code} />
      <CountryPicker savedCountry={user.country_code} />
      <InputQuote
        text={user.bio ?? ""}
        name="bio"
        placeholder="Message to the world"
      />
    </aside>
  );
}

type ProfileProps = {
  user: Profile;
  socials: SelectSocial[];
  presence: Presence;
  edit?: boolean;
  /** Share and edit, for the owner: under the identity. */
  actions?: React.ReactNode;
  /** What follows the places: testimonials, comments, the way to a page of one's own. */
  children?: React.ReactNode;
};

/** A profile as an ID card beside the person's places: on a wide screen the card
 *  holds still on the left while the bio, the socials and what others wrote go
 *  down the right; on a phone they stack under it. */
export default function UserProfile({
  user,
  socials,
  presence,
  edit,
  actions,
  children,
}: ProfileProps) {
  const content = (
    <div className="grid animate-fade-in gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      {edit ? (
        <IdentityEdit user={user} />
      ) : (
        <Identity user={user} actions={actions} />
      )}
      <main className="flex min-w-0 flex-col gap-10">
        <SocialComponent socials={socials} edit={edit} presence={presence} />
        {edit && (
          <div className="flex items-center justify-end gap-2">
            <DiscardButton username={user.username} />
            <SaveButton />
          </div>
        )}
        {children}
      </main>
    </div>
  );

  if (edit) {
    return <EditForm>{content}</EditForm>;
  }

  return content;
}
