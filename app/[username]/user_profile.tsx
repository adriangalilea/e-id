import { ProfileLinks } from "@/components/profile-links";
import type { HolderLink } from "@/components/id-card";
import { cardLinkOf } from "@/lib/data";
import { MaterialProvider } from "@/components/ui/material";
import { cn } from "@/lib/utils";
import { SaveContact } from "@/components/save-contact";
import { ProfileCard } from "@/components/profile-card";
import type { SelectLink } from "@/db/schema";
import type { Profile } from "@/lib/data";
import type { Presence } from "@/lib/presence";
import { PROFILE } from "@/components/profile-layout";

/** Who this is: their e-id card, its flair their links and its hologram answering
 *  the hand, then what they say of themselves. For its owner the card is also
 *  where it is changed (components/profile-card). */
function Identity({
  user,
  links,
  actions,
}: {
  user: Profile;
  links: HolderLink[];
  actions?: React.ReactNode;
}) {
  return (
    <header className={PROFILE.identity}>
      <ProfileCard
        holder={{
          name: user.name,
          username: user.username,
          image: user.image,
          country: user.country_code,
          bio: user.bio,
          links,
        }}
      >
        {user.bio && (
          <p className="px-1 text-[17px] leading-relaxed font-light text-pretty text-foreground/80">
            {user.bio}
          </p>
        )}
        {/* For whoever is looking: this card as a contact (lib/vcard), their
            photo, name, address and every link, saved on a phone in one tap. */}
        <SaveContact username={user.username} className="self-start" />
        {actions}
      </ProfileCard>
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
 *  (`display: contents`): its two parts sit in their own cells of the page's
 *  grid, the card at the head, the vouches last. */
function Side({
  user,
  links,
  actions,
  vouches,
}: {
  user: Profile;
  links: HolderLink[];
  actions?: React.ReactNode;
  vouches?: React.ReactNode;
}) {
  return (
    <aside className={PROFILE.side}>
      <Identity user={user} links={links} actions={actions} />
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

type ProfileProps = {
  user: Profile;
  links: SelectLink[];
  presence: Presence;
  /** Share and edit, for the owner: under the identity. */
  actions?: React.ReactNode;
  /** What others say of the person: the pinned testimonials and the comments. */
  vouches?: React.ReactNode;
};

/** A profile as a split view in the golden ratio, two different things. WHO, the
 *  smaller part (38.2%): one pane held still (`Side`). WHERE, the larger (61.8%):
 *  the person's links, the page that scrolls. On a phone: the card, the links,
 *  then the vouches (grid areas). */
export default function UserProfile({
  user,
  links,
  presence,
  actions,
  vouches,
}: ProfileProps) {
  return (
    <div className={cn(PROFILE.grid, "animate-fade-in")}>
      <Side
        user={user}
        // Each mark carries who they are there, its compact profile on hover.
        links={links.map((link) => ({
          ...cardLinkOf(link),
          profile: presence.profiles.find((p) => p.platform === link.platform),
        }))}
        actions={actions}
        vouches={vouches}
      />
      <main className={PROFILE.links}>
        <ProfileLinks links={links} presence={presence} />
      </main>
    </div>
  );
}
