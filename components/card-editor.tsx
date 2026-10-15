"use client"

import { ArrowLeft, ArrowRight, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  CountryOnCard,
  HandleOnCard,
  LinksOnCard,
  NameOnCard,
  WRITTEN_HERE,
} from "@/components/card-fields"
import { IdCard } from "@/components/id-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  Form,
  type FormHandle,
  FormSubmit,
  FormSummary,
  useForm,
  useFormField,
  useFormState,
} from "@/components/ui/form"
import { HoloLight } from "@/components/ui/holo"
import { InputGroup } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { handleState, saveCard } from "@/db/actions"
import { type CardEdit, cardEditSchema, type EditLink } from "@/lib/card-edit"
import { errorAt, isDirty } from "@/lib/form-core"
import { HIGHLIGHTED, type LinkPlatform, OFFERED } from "@/lib/platforms"
import { cn } from "@/lib/utils"

// AN OWNER'S CARD LIFTED TO BE WRITTEN ON (components/profile-card opens it), as
// the home's blank card is (components/card-fields): the name on its line, the
// handle after the address, the country on its flag, each link a mark that opens
// to its address, a note shown over it, a highlight, whether it shows; under the
// card, what they say of themselves. One form (@ag/form) over one schema both
// sides share (lib/card-edit), saved whole by one action (db/actions,
// `saveCard`). Its own module, loaded when an owner opens their card: a visitor's
// page carries none of it, the schema's zod included.

type CardForm = FormHandle<CardEdit>

export function CardEditor({
  initial,
  image,
  lifted,
  onClose,
}: {
  initial: CardEdit
  image: string | null
  /** The view-transition name the card wears, the page's card's own, so the
   *  lift carries it from the page to the middle and back. */
  lifted: string
  onClose: () => void
}) {
  const router = useRouter()
  const form = useForm<CardEdit>({
    initial,
    schema: cardEditSchema,
    checks: {
      // Whether a new handle is free, as it is typed: the schema has said it is
      // a username. Asked again on save, for exactly the handle sent.
      handle: {
        debounce: 300,
        run: async (value) => {
          if (value === initial.handle) return undefined
          const { state, why } = await handleState(String(value))
          if (state === "taken") return "That username is taken."
          return state === "invalid" ? (why ?? "Not a username.") : undefined
        },
      },
    },
    onSubmit: async (values) => {
      const saved = await saveCard(values)
      if (!saved.ok) return { errors: saved.errors }
      // The page under it re-rendered with the write in the same response; a
      // new handle is a new address.
      if (saved.username !== initial.handle)
        router.replace(`/${saved.username}`)
      onClose()
    },
  })
  // Written on, it is put down only by saving or by "cancel": Esc or a press
  // outside never throws away what was written.
  const dirty = useFormState(form, (s) => isDirty(s) || s.submitting)
  return (
    <Dialog
      open
      disablePointerDismissal={dirty}
      onOpenChange={(open) => {
        if (!open && !dirty) onClose()
      }}
    >
      <DialogContent
        bare
        backdrop="bg-background/70 backdrop-blur-md"
        className="top-[max(5rem,10dvh)] max-h-[calc(100dvh-max(5rem,10dvh)-1rem)] w-[min(40rem,calc(100vw-2rem))] translate-y-0 overflow-y-auto overscroll-contain"
      >
        <DialogTitle className="sr-only">your card</DialogTitle>
        <Form form={form} className="gap-6 pb-2">
          <div className={lifted}>
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
          <form.Field
            name="bio"
            label="about you"
            aside="on your page, under the card"
          >
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
          <form.Field
            name="vouches"
            label="vouches"
            aside="people can leave a word on your page"
            orientation="horizontal"
          >
            {(c) => (
              <Switch
                checked={c.value}
                onCheckedChange={(checked) => c.onValueChange(checked)}
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
  )
}

/** What is wrong with what is written on the card itself, under it, once due:
 *  its fields are the card's writing and have no line of their own to say it. */
function CardSays({ form }: { form: CardForm }) {
  const said = useFormState(form, (s) =>
    (["handle", "name", "country"] as const)
      .map((path) => errorAt(s, path))
      .filter(Boolean)
      .join(" "),
  )
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
  )
}

// Each on-card field bound headless (@ag/form, `useFormField`), its `anchor` taken
// apart from its value: React's compiler reads whatever object a ref came from as a
// ref.

function NameField({ form }: { form: CardForm }) {
  const { anchor, value, onValueChange, onBlur, invalid } = useFormField(
    form,
    "name",
    "name",
  )
  return (
    <NameOnCard
      ref={anchor}
      label="your name"
      value={value}
      onChange={onValueChange}
      onBlur={onBlur}
      invalid={invalid}
    />
  )
}

function HandleField({ form }: { form: CardForm }) {
  const { anchor, value, onValueChange, onBlur, invalid, checking } =
    useFormField(form, "handle", "username")
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
  )
}

function CountryField({ form }: { form: CardForm }) {
  const { anchor, value, onValueChange } = useFormField(
    form,
    "country",
    "country",
  )
  return (
    <span ref={anchor} className="contents">
      <CountryOnCard
        label="your country"
        code={value}
        onChange={onValueChange}
      />
    </span>
  )
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
})

/** The card's links, written as every card's are (card-fields, `LinksOnCard`),
 *  kept in the form: what an owner's card offers besides where is its `detail`,
 *  where it stands among the others, a note, a highlight, whether it shows. */
function LinksField({ form }: { form: CardForm }) {
  const links = useFormState(form, (s) => s.values.links)
  // Which links have something wrong, as one string ("01…", a link a character):
  // a selector's answer is compared by value, and a new array every time would
  // redraw the row on every keystroke anywhere in the form.
  const wrong = useFormState(form, (s) =>
    s.values.links
      .map((_, i) =>
        (["value", "note", "highlight"] as const).some(
          (field) => errorAt(s, `links.${i}.${field}`) !== undefined,
        )
          ? "1"
          : "0",
      )
      .join(""),
  )
  const save = (platform: LinkPlatform, value: string) => {
    const index = form
      .get()
      .values.links.findIndex((l) => l.platform === platform)
    if (index === -1) form.append("links", { ...BLANK_LINK(platform), value })
    else if (!value) form.remove("links", index)
    else form.setValue(`links.${index}.value`, value)
  }
  return (
    <LinksOnCard
      links={links.map((l, i) => ({
        platform: l.platform,
        value: l.value,
        hidden: !l.public,
        wrong: wrong[i] === "1",
      }))}
      offered={OFFERED}
      onSave={save}
      detail={(index) => ({
        head: (
          <LinkPlace
            index={index}
            count={links.length}
            onMove={(to) => form.move("links", index, to)}
          />
        ),
        body: <LinkMore form={form} index={index} />,
        error: errorAt(form.get(), `links.${index}.value`),
      })}
    />
  )
}

/** Where a link stands among the others, a step either way. */
function LinkPlace({
  index,
  count,
  onMove,
}: {
  index: number
  count: number
  onMove: (to: number) => void
}) {
  return (
    <>
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
    </>
  )
}

/** What an owner's card says of a link beyond where: a note shown over it, the
 *  video or post to show first where the platform has one, whether it shows. */
function LinkMore({ form, index }: { form: CardForm; index: number }) {
  const path = `links.${index}` as const
  const platform = useFormState(form, (s) => s.values.links[index]?.platform)
  if (!platform) return null
  return (
    <>
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
          label={
            platform === "youtube"
              ? "video to show first"
              : "post to show first"
          }
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
    </>
  )
}
