"use client";

import { ArrowLeft, ArrowRight, Pen, Plus, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, use, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  CountryOnCard,
  HandleOnCard,
  NameOnCard,
  LINK_MARK,
  LINKS_ON_CARD,
  PlatformChoice,
  WRITTEN_HERE,
} from "@/components/card-fields";
import { prefixOf, valueOf } from "@/lib/link-names";
import { CORNER } from "@/components/card-shape";
import { type Holder, IdCard } from "@/components/id-card";
import { SubjectLight } from "@/components/light";
import { useChip } from "@/components/session/use-chip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  type FormHandle,
  FormSubmit,
  FormSummary,
  useForm,
  useFormField,
  useFormState,
} from "@/components/ui/form";
import { HoloLean, HoloLight } from "@/components/ui/holo";
import { InputGroup } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cardToEdit, handleState, saveCard } from "@/db/actions";
import type { LinkPlatform } from "@/db/schema";
import {
  type CardEdit,
  cardEditSchema,
  type EditLink,
  HIGHLIGHTED,
  OFFERED,
} from "@/lib/card-edit";
import { errorAt, isDirty } from "@/lib/form-core";
import { getLinkIcon, getLinkPlaceholder } from "@/lib/links";
import { cn } from "@/lib/utils";

// A PROFILE'S CARD, and for its owner the way to change it: the card itself. Pressed
// (or "edit"), it lifts off the page to the upper middle, the page dimmed behind it,
// and is written on where it lies, as the home's blank card is (components/
// card-fields): the name on its line, the handle after the address, the country on
// its flag, each link a mark that opens to its address, a note shown over it, a
// highlight, whether it shows; under the card, what they say of themselves. One form
// (@ag/form) over one schema both sides share (lib/card-edit), saved whole by one
// action (db/actions, `saveCard`). Who owns the page is known only in the browser
// (`useChip`), so the page stays static; their hidden links are read only when they
// open it (`cardToEdit`).

/** The card's name across the lift: worn by whichever copy is shown, so a view
 *  transition carries it from the page to the middle and back. */
const LIFTED = "[view-transition-name:own-card]";

/** The way to edit one's own card, for what stands round it (the owner's
 *  actions); null for anyone else. */
const Own = createContext<{ open: () => void; opening: boolean } | null>(null);

export function useOwnCard() {
  return use(Own);
}

/** A change of the page's state carried by a view transition (none under reduced
 *  motion or where there are none), React drawing it inside (`flushSync`). */
function carried(change: () => void) {
  if (
    !document.startViewTransition ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return change();
  document.startViewTransition(() => flushSync(change));
}

export function ProfileCard({
  holder,
  children,
}: {
  holder: Holder;
  /** What stands under the card (the bio, save contact, the owner's actions). */
  children: React.ReactNode;
}) {
  const chip = useChip();
  const owner = chip?.u?.toLowerCase() === holder.username.toLowerCase();
  const [initial, setInitial] = useState<CardEdit | null>(null);
  const [opening, setOpening] = useState(false);
  // Read once the hand comes near, so the press finds it there.
  const read = useRef<Promise<CardEdit> | null>(null);
  const load = () => {
    read.current ??= cardToEdit();
    return read.current;
  };
  const open = () => {
    if (opening || initial) return;
    setOpening(true);
    load().then(
      (card) => {
        setOpening(false);
        carried(() => setInitial(card));
      },
      (error) => {
        setOpening(false);
        read.current = null;
        throw error;
      },
    );
  };
  const close = () => {
    read.current = null;
    carried(() => setInitial(null));
  };
  const editing = initial !== null;
  return (
    <Own value={owner ? { open, opening } : null}>
      {/* The same card as the home's: the laminate, a solid body, leaning to the
          hand, only resting flat, as the page's subject. Lifted, its room is
          kept and it is not drawn: the card is in the middle. */}
      <HoloLight className={cn("relative", editing ? "invisible" : LIFTED)}>
        <SubjectLight />
        <HoloLean pose="flat" className="max-lg:[transform:none]">
          <IdCard
            holder={holder}
            holo="laminate"
            className="[--id-card-thickness:1]"
          />
        </HoloLean>
        {owner && (
          // For its owner the whole card is one press: taking it up to write on.
          // Under the hand it says so.
          <button
            type="button"
            aria-label="edit your card"
            aria-busy={opening || undefined}
            onClick={open}
            onPointerEnter={() => void load()}
            onFocus={() => void load()}
            className={cn(
              CORNER,
              "group/edit absolute inset-0 z-10 cursor-pointer outline-offset-4",
            )}
          >
            <span
              aria-hidden
              className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 text-sm text-foreground/85 opacity-0 backdrop-blur-md transition-opacity group-hover/edit:opacity-100 group-focus-visible/edit:opacity-100 [&_svg]:size-3.5"
            >
              <Pen strokeWidth={1.5} />
              {opening ? "opening" : "edit"}
            </span>
          </button>
        )}
      </HoloLight>
      {children}
      {initial && (
        <CardEditor initial={initial} image={holder.image} onClose={close} />
      )}
    </Own>
  );
}

// ── the card lifted to be written on ─────────────────────────────────────────

type CardForm = FormHandle<CardEdit>;

function CardEditor({
  initial,
  image,
  onClose,
}: {
  initial: CardEdit;
  image: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const form = useForm<CardEdit>({
    initial,
    schema: cardEditSchema,
    checks: {
      // Whether a new handle is free, as it is typed: the schema has said it is
      // a username. Asked again on save, for exactly the handle sent.
      handle: {
        debounce: 300,
        run: async (value) => {
          if (value === initial.handle) return undefined;
          const { state, why } = await handleState(String(value));
          if (state === "taken") return "That username is taken.";
          return state === "invalid" ? (why ?? "Not a username.") : undefined;
        },
      },
    },
    onSubmit: async (values) => {
      const saved = await saveCard(values);
      if (!saved.ok) return { errors: saved.errors };
      // The page under it re-rendered with the write in the same response; a
      // new handle is a new address.
      if (saved.username !== initial.handle)
        router.replace(`/${saved.username}`);
      onClose();
    },
  });
  // Written on, it is put down only by saving or by "cancel": Esc or a press
  // outside never throws away what was written.
  const dirty = useFormState(form, (s) => isDirty(s) || s.submitting);
  return (
    <Dialog
      open
      disablePointerDismissal={dirty}
      onOpenChange={(open) => {
        if (!open && !dirty) onClose();
      }}
    >
      <DialogContent
        bare
        backdrop="bg-background/70 backdrop-blur-md"
        className="top-[max(5rem,10dvh)] max-h-[calc(100dvh-max(5rem,10dvh)-1rem)] w-[min(40rem,calc(100vw-2rem))] translate-y-0 overflow-y-auto overscroll-contain"
      >
        <DialogTitle className="sr-only">your card</DialogTitle>
        <Form form={form} className="gap-6 pb-2">
          <div className={LIFTED}>
            <HoloLight className="relative">
              <IdCard
                holo="laminate"
                className="[--id-card-thickness:1]"
                holder={{
                  name: initial.name,
                  username: initial.handle,
                  image,
                  country: initial.country,
                  bio: initial.bio,
                }}
                slots={{
                  name: <NameField form={form} />,
                  head: <HandleField form={form} />,
                  country: <CountryField form={form} />,
                  flair: <LinksField form={form} />,
                }}
              />
            </HoloLight>
          </div>
          <CardSays form={form} />
          <form.Field name="bio" label="about you" aside="on your page, under the card">
            {(c) => (
              <Textarea
                material="glass"
                size="lg"
                rows={2}
                maxRows={6}
                placeholder="a line about you"
                {...c.input}
              />
            )}
          </form.Field>
          <FormSummary material="glass" />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              material="glass"
              variant="ghost"
              size="lg"
              onClick={onClose}
            >
              cancel
            </Button>
            <FormSubmit material="glass" size="lg">
              save
            </FormSubmit>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/** What is wrong with what is written on the card itself, under it, once due:
 *  its fields are the card's writing and have no line of their own to say it. */
function CardSays({ form }: { form: CardForm }) {
  const said = useFormState(form, (s) =>
    (["handle", "name", "country"] as const)
      .map((path) => errorAt(s, path))
      .filter(Boolean)
      .join(" "),
  );
  return (
    <p
      aria-live="polite"
      className={cn(
        "-mt-3 min-h-5 px-1 text-sm text-tone-bad transition-opacity",
        !said && "opacity-0",
      )}
    >
      {said}
    </p>
  );
}

// Each on-card field bound headless (@ag/form, `useFormField`), its `anchor` taken
// apart from its value: React's compiler reads whatever object a ref came from as a
// ref.

function NameField({ form }: { form: CardForm }) {
  const { anchor, value, onValueChange, onBlur, invalid } = useFormField(
    form,
    "name",
    "name",
  );
  return (
    <NameOnCard
      ref={anchor}
      label="your name"
      value={value}
      onChange={onValueChange}
      onBlur={onBlur}
      invalid={invalid}
    />
  );
}

function HandleField({ form }: { form: CardForm }) {
  const { anchor, value, onValueChange, onBlur, invalid, checking } =
    useFormField(form, "handle", "username");
  return (
    <span
      ref={anchor}
      className="flex min-w-0 items-center gap-[0.5em] font-mono text-[3.2cqw]"
    >
      <HandleOnCard
        label="your username"
        value={value}
        onChange={onValueChange}
        onBlur={onBlur}
        invalid={invalid}
      />
      {checking && <span className="text-foreground/45">…</span>}
    </span>
  );
}

function CountryField({ form }: { form: CardForm }) {
  const { anchor, value, onValueChange } = useFormField(
    form,
    "country",
    "country",
  );
  return (
    <span ref={anchor} className="contents">
      <CountryOnCard
        label="your country"
        code={value}
        onChange={onValueChange}
      />
    </span>
  );
}

// ── links ────────────────────────────────────────────────────────────────────

const BLANK_LINK = (platform: LinkPlatform): EditLink => ({
  id: null,
  platform,
  value: "",
  label: "",
  note: "",
  highlight: "",
  public: true,
});

/** The card's links as marks, each opening to what it holds, and "+" to add
 *  one: the platform first, then its own popover opens on it. */
function LinksField({ form }: { form: CardForm }) {
  // The row just added, its popover open from the start.
  const [fresh, setFresh] = useState<number | null>(null);
  return (
    <form.FieldArray name="links">
      {(rows, ops) => (
        <div role="group" aria-label="links" className={LINKS_ON_CARD}>
          {rows.map((row) => (
            <LinkMark
              key={row.key}
              form={form}
              index={row.index}
              count={rows.length}
              startOpen={row.index === fresh}
              onMove={(to) => ops.move(row.index, to)}
              onRemove={() => {
                setFresh(null);
                ops.remove(row.index);
              }}
            />
          ))}
          <AddLink
            form={form}
            onPick={(platform) => {
              setFresh(rows.length);
              ops.append(BLANK_LINK(platform));
            }}
          />
        </div>
      )}
    </form.FieldArray>
  );
}

/** "+": the platforms on offer not on the card yet, one link each (lib/card-edit,
 *  `OFFERED`); gone once every one is there. */
function AddLink({
  form,
  onPick,
}: {
  form: CardForm;
  onPick: (platform: LinkPlatform) => void;
}) {
  const [open, setOpen] = useState(false);
  const taken = useFormState(form, (s) =>
    s.values.links.map((l) => l.platform).join(" "),
  );
  const rest = OFFERED.filter((p) => !taken.split(" ").includes(p));
  if (rest.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="add a link"
            // A mark like the links beside it, a step dimmer: one more to add.
            className={cn(LINK_MARK, "text-foreground/55")}
          />
        }
      >
        <Plus />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <PlatformChoice
          platforms={rest}
          onPick={(platform) => {
            setOpen(false);
            onPick(platform);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** One link: its mark on the card (dim while hidden, red while something on it
 *  is wrong), opening to its address (the platform's before it), a note, a
 *  highlight where the platform has one, whether it shows, and where it stands
 *  among the others. Closed with no address, it was never added. */
function LinkMark({
  form,
  index,
  count,
  startOpen,
  onMove,
  onRemove,
}: {
  form: CardForm;
  index: number;
  count: number;
  startOpen: boolean;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const path = `links.${index}` as const;
  const link = useFormState(form, (s) => s.values.links[index]);
  const wrong = useFormState(
    form,
    (s) =>
      (["value", "note", "highlight"] as const).some(
        (field) => errorAt(s, `${path}.${field}`) !== undefined,
      ),
  );
  const [open, setOpen] = useState(startOpen);
  if (!link) return null;
  const { platform } = link;
  const close = () => {
    setOpen(false);
    if (!form.get().values.links[index]?.value.trim()) onRemove();
  };
  return (
    <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`${platform}: ${link.value || "no address yet"}${link.public ? "" : ", hidden"}`}
            className={cn(
              LINK_MARK,
              !link.public && "opacity-35",
              wrong && "text-tone-bad",
            )}
          />
        }
      >
        {getLinkIcon(platform)}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-3 p-3">
        <div
          className="flex flex-col gap-3"
          onKeyDown={(e) => {
            // Enter in a line keeps it: the popover closes, the card stays open.
            if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
              e.preventDefault();
              close();
            }
          }}
        >
          <div className="flex h-7 items-center gap-2 pl-1 text-sm text-foreground/85 [&_svg]:stroke-[1.5]">
            <span className="[&_svg]:size-4">{getLinkIcon(platform)}</span>
            {platform}
            <span className="ml-auto flex items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="earlier"
                disabled={index === 0}
                onClick={() => onMove(index - 1)}
                className="text-foreground/50"
              >
                <ArrowLeft />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="later"
                disabled={index === count - 1}
                onClick={() => onMove(index + 1)}
                className="text-foreground/50"
              >
                <ArrowRight />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`remove ${platform}`}
                onClick={() => {
                  setOpen(false);
                  onRemove();
                }}
                className="text-foreground/50"
              >
                <X />
              </Button>
            </span>
          </div>
          <form.Field name={`${path}.value`} label={`${platform} address`}>
            {(c) => (
              <InputGroup
                size="sm"
                autoFocus
                {...WRITTEN_HERE}
                spellCheck={false}
                autoCapitalize="none"
                placeholder={getLinkPlaceholder(platform)}
                {...c.input}
                // A pasted address is read as the username it ends in.
                onChange={(e) => c.onValueChange(valueOf(platform, e.target.value))}
                // The platform's address the username continues, in the same
                // type: "github.com/adriangalilea", one address.
                prefix={prefixOf(platform) || undefined}
              />
            )}
          </form.Field>
          <form.Field
            name={`${path}.note`}
            label="note"
            aside="optional, shown over it"
          >
            {(c) => (
              <Textarea
                size="sm"
                rows={2}
                maxRows={5}
                placeholder="what to say about it"
                {...c.input}
              />
            )}
          </form.Field>
          {HIGHLIGHTED.includes(platform) && (
            <form.Field
              name={`${path}.highlight`}
              label={platform === "youtube" ? "video to show first" : "post to show first"}
              aside="optional, its id"
            >
              {(c) => (
                <InputGroup
                  size="sm"
                  {...WRITTEN_HERE}
                  spellCheck={false}
                  start={<Star strokeWidth={1.5} />}
                  {...c.input}
                />
              )}
            </form.Field>
          )}
          <form.Field
            name={`${path}.public`}
            label="on your card"
            orientation="horizontal"
          >
            {(c) => (
              <Switch
                size="sm"
                checked={c.value}
                onCheckedChange={(checked) => c.onValueChange(checked)}
              />
            )}
          </form.Field>
        </div>
      </PopoverContent>
    </Popover>
  );
}
