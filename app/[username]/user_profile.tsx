import { SocialComponent } from "@/components/social_component";
import { InputQuote } from "@/components/quote";
import { IdCard, type Place } from "@/components/id-card";
import { placeOf } from "@/lib/data";
import { Tilt } from "@/components/landing/tilt";
import { MaterialProvider } from "@/components/ui/material";
import { cn } from "@/lib/utils";
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

/** Who this is: their e-id card, its flair their places and its hologram answering
 *  the hand, then what they say of themselves. */
function Identity({
  user,
  places,
  actions,
}: {
  user: Profile;
  places: Place[];
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 max-lg:[grid-area:id]">
      {/* The same card as the home's: the laminate, a solid body, leaning to the
          hand, only resting flat, as the page's subject. */}
      <Tilt pose="flat" className="lg:[perspective:2000px]">
        <div data-slot="tilt-front">
          <IdCard
            holder={{
              name: user.name,
              username: user.username,
              image: user.image,
              country: user.country_code,
              bio: user.bio,
              places,
            }}
            holo="laminate"
            className="[--id-card-thickness:1]"
          />
        </div>
      </Tilt>
      {user.bio && (
        <p className="px-1 text-[17px] leading-relaxed font-light text-pretty text-foreground/80">
          {user.bio}
        </p>
      )}
      {actions}
    </header>
  );
}

/** What others say, set INTO the page rather than on it: no surface, the words dim,
 *  and each letter lit as a debossed one is, a dark edge above (the lip that
 *  shades it) and a faint light one below (the floor of the cut catching the
 *  light from above). Text shadows inherit, so the quote's words, name and date all
 *  take it. */
const ENGRAVED =
  "[text-shadow:0_-1px_0_rgb(0_0_0/0.7),0_1px_0_rgb(255_255_255/0.07)] [&_[data-slot=quote-body]]:text-foreground/50 [&_[data-slot=quote-name]]:text-foreground/45";

/** The person's side of a wide screen, held still under the bar, as tall as the
 *  screen less the page's room for the bar (5rem, layout) and its foot (3rem). No
 *  pane: the e-id card stands alone at its top, the one object on the page that
 *  floats, and what others say of them lies engraved in the ground under it,
 *  scrolling in its own room (fading at its foot, no bar: a short capped
 *  scroller) so the side never moves with the page. On a phone it is no box
 *  (`display: contents`): its two parts take their own places in the page's grid,
 *  the card at the head, the vouches last. */
function Side({
  user,
  places,
  actions,
  vouches,
}: {
  user: Profile;
  places: Place[];
  actions?: React.ReactNode;
  vouches?: React.ReactNode;
}) {
  return (
    <aside className="max-lg:contents lg:sticky lg:top-20 lg:flex lg:h-[calc(100dvh-8rem)] lg:min-h-0 lg:flex-col lg:gap-10 lg:self-start lg:[grid-area:side]">
      <Identity user={user} places={places} actions={actions} />
      <MaterialProvider material="plain">
        <div
          className={cn(
            "flex min-h-0 flex-col gap-1 text-sm max-lg:[grid-area:vouch] lg:flex-1 lg:overflow-y-auto lg:pb-8 lg:[mask-image:linear-gradient(to_bottom,black_calc(100%-2rem),transparent)] lg:[scrollbar-width:none]",
            ENGRAVED,
          )}
        >
          {vouches}
        </div>
      </MaterialProvider>
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
  /** What others say of the person: the pinned testimonials and the comments. */
  vouches?: React.ReactNode;
};

/** A profile as a split view in the golden ratio, two different things. WHO, the
 *  smaller part (38.2%): one pane held still (`Side`). WHERE, the larger (61.8%):
 *  the person's places, the page that scrolls. On a phone: the card, the places,
 *  then the vouches (grid areas). The edit form keeps its own two columns. */
export default function UserProfile({
  user,
  socials,
  presence,
  edit,
  actions,
  vouches,
}: ProfileProps) {
  if (!edit)
    return (
      <div className="grid animate-fade-in gap-10 [grid-template-areas:'id'_'places'_'vouch'] lg:grid-cols-[minmax(0,38.2fr)_minmax(0,61.8fr)] lg:[grid-template-areas:'side_places']">
        <Side
          user={user}
          places={socials.map(placeOf)}
          actions={actions}
          vouches={vouches}
        />
        <main className="flex min-w-0 flex-col gap-16 [grid-area:places]">
          <SocialComponent socials={socials} presence={presence} />
        </main>
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
        </main>
      </div>
    </EditForm>
  );
}
