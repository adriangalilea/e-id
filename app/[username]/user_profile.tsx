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

/** The handle, large and faint behind the card: what the glass card stands in front
 *  of and frosts, so it reads as glass and not as a grey panel. It ends just past
 *  the card and runs off the screen's left edge, never under what is read. */
function Backdrop({ username }: { username: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-1/2 right-[-2rem] -z-10 w-screen -translate-y-1/2 overflow-hidden text-right text-[clamp(6rem,13vw,12rem)] leading-none font-medium tracking-[-0.06em] whitespace-nowrap text-white/[0.055] select-none"
    >
      {username}
    </div>
  );
}

/** Who this is: their e-id card, in the light, then what they say of themselves. */
function Identity({
  user,
  actions,
}: {
  user: Profile;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6 [grid-area:id]">
      <div className="relative isolate">
        <Backdrop username={user.username} />
        <IdCard
          holder={{
            name: user.name,
            username: user.username,
            image: user.image,
            country: user.country_code,
            bio: user.bio,
          }}
        />
      </div>
      {user.bio && (
        <p className="text-[17px] leading-relaxed font-light text-pretty text-foreground/80">
          {user.bio}
        </p>
      )}
      {actions}
    </header>
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
  /** What others say of the person: the pinned testimonials and the comments. */
  vouches?: React.ReactNode;
  /** What follows the places: the way to a page of one's own. */
  children?: React.ReactNode;
};

/** A profile in two columns, each with one job. WHO on the left: the card, what the
 *  person says of themselves, then what others say of them. WHERE on the right:
 *  their places, from the first line, so what they made is on the first screen.
 *  On a phone: the card, the places, then the vouches (grid areas, so the order is
 *  the reading order on each). The edit form keeps its own two columns. */
export default function UserProfile({
  user,
  socials,
  presence,
  edit,
  actions,
  vouches,
  children,
}: ProfileProps) {
  if (!edit)
    return (
      <div className="grid animate-fade-in gap-12 [grid-template-areas:'id'_'places'_'vouch'] lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:[grid-template-areas:'id_places'_'vouch_places']">
        <Identity user={user} actions={actions} />
        <main className="flex min-w-0 flex-col gap-16 [grid-area:places]">
          <SocialComponent socials={socials} presence={presence} />
          {children}
        </main>
        <aside className="flex min-w-0 flex-col gap-4 text-sm [grid-area:vouch]">
          {vouches}
        </aside>
      </div>
    );

  return (
    <EditForm>
      <div className="grid animate-fade-in gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <IdentityEdit user={user} />
        <main className="flex min-w-0 flex-col gap-10">
          <SocialComponent socials={socials} edit presence={presence} />
          <div className="flex items-center justify-end gap-2">
            <DiscardButton username={user.username} />
            <SaveButton />
          </div>
          {children}
        </main>
      </div>
    </EditForm>
  );
}
