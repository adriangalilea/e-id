import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { type ReactNode, Suspense } from "react"
import { ShortLinksSpecimen } from "@/app/dev/specimens"
import { Address, AddressFormPicker } from "@/components/addresses"
import { EmojiDomain } from "@/components/brand"
import { Tweet } from "@/components/ui/tweet"
import { XProfileGuide } from "@/components/x-profile-guide"
import { CHECKED, FORMS, UNCHECKED, urlOf, type Verdict } from "@/lib/addresses"
import { isAdmin } from "@/lib/env"
import { getSession } from "@/lib/session"
import type { Tweet as TweetFacts } from "@/lib/tweet-data"

// E-ID'S PATTERNS, live: each way the site does a thing more than once, drawn by
// the components that do it, with the facts it stands on, so a new place doing
// the same thing takes the pattern instead of inventing one. Specimens over a
// made-up person (Ada, from the home's examples: her addresses open no profile).
// On the dev server for anyone, deployed for e-ID's admins only (ADMIN_USER_IDS):
// a 404 to anyone else.

export const metadata: Metadata = {
  title: "patterns",
  robots: { index: false, follow: false },
}

const ADA = "adalovelace"
const AUTHOR = {
  name: "Ada Lovelace",
  handle: "@adalovelace",
  avatar: "/showcase/adalovelace.png",
}

/** A post on X with an address in it, as X draws it: `href` where X found a link
 *  (shown without `https://`, the emoji as it is), none where it found none. */
function post(id: string, typed: string, href?: string): TweetFacts {
  return {
    id,
    url: "https://x.com",
    author: AUTHOR,
    date: "2026-10-16T12:00:00Z",
    body: [
      { text: "everywhere I am: " },
      href ? { text: typed.replace(/^https:\/\//, ""), href } : { text: typed },
    ],
    media: [],
    likes: 0,
    replies: 0,
  }
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-14 px-4 py-16">
      <Suspense fallback={null}>
        <Patterns />
      </Suspense>
    </main>
  )
}

async function Patterns() {
  if (process.env.NODE_ENV !== "development") {
    const session = await getSession()
    if (!session || !isAdmin(session.user.id)) notFound()
  }
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl">patterns</h1>
        <p className="text-foreground/60 text-sm">
          Each thing e-ID does in more than one place, done one way: the
          components that do it, live, and the facts they stand on.
        </p>
      </header>
      <Addresses />
      <HandingOut />
    </>
  )
}

function Section({
  title,
  says,
  children,
}: {
  title: string
  says: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg">{title}</h2>
        <p className="text-foreground/60 text-sm">{says}</p>
      </div>
      {children}
    </section>
  )
}

function Specimen({ name, children }: { name: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="font-mono text-foreground/45 text-xs">
        {name}
      </figcaption>
      <div className="rounded-2xl border border-border p-4">{children}</div>
    </figure>
  )
}

/** One place's verdict on one form: a link at full strength, what refuses it
 *  loud, what was not checked faint. */
function Cell({ verdict: v }: { verdict: Verdict }) {
  const cell = "py-2 pr-4"
  if (v.is === "link")
    return (
      <td className={`${cell} text-foreground/85`}>
        {v.bare ? "a link, even bare" : "a link with https://"}
        {v.shows && (
          <div className="text-foreground/45 text-xs">shown as {v.shows}</div>
        )}
      </td>
    )
  if (v.is === "refused")
    return (
      <td className={`${cell} text-destructive`}>
        refused
        <div className="text-foreground/45 text-xs">“{v.says}”</div>
      </td>
    )
  if (v.is === "text")
    return <td className={`${cell} text-foreground/55`}>text</td>
  return <td className={`${cell} text-foreground/25`}>not checked</td>
}

/** The domains, what each is for, and what was checked of each. */
function Addresses() {
  return (
    <Section
      title="four spellings, one page"
      says={
        <>
          Every address opens the same page on all of them, so which one to hand
          out depends only on where it is going (lib/addresses). A copy is
          always the whole address: without https://, <EmojiDomain /> is a link
          nowhere checked. xn--mq8h.to is the same domain, spelled the way a
          browser sends it.
        </>
      }
    >
      <ul className="flex flex-col">
        {FORMS.map((f) => (
          <li
            key={f.id}
            className="flex flex-col gap-1 border-border border-t py-3 first:border-t-0 sm:flex-row sm:gap-6"
          >
            <span className="w-28 shrink-0 font-mono">
              {f.id === "emoji" ? <EmojiDomain /> : f.host}
            </span>
            <span className="text-foreground/60 text-sm">{f.for}</span>
          </li>
        ))}
      </ul>
      <Specimen name="where an address becomes a link (lib/addresses CHECKED)">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-foreground/45 text-xs">
              <tr>
                <th className="py-2 pr-4 font-normal">place</th>
                {FORMS.map((f) => (
                  <th key={f.id} className="py-2 pr-4 font-normal font-mono">
                    {f.id === "emoji" ? <EmojiDomain /> : f.host}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CHECKED.map((c) => (
                <tr key={c.place} className="border-border border-t align-top">
                  <td className="py-2 pr-4">
                    <div>{c.place}</div>
                    <div className="text-foreground/40 text-xs">{c.how}</div>
                  </td>
                  {FORMS.map((f) => (
                    <Cell key={f.id} verdict={c.verdicts[f.id]} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-foreground/40 text-xs">
          Not checked yet: {UNCHECKED.join(", ")}.
        </p>
      </Specimen>
    </Section>
  )
}

/** Handing out an address: one, many, and what it becomes where it lands. */
function HandingOut() {
  return (
    <Section
      title="handing out an address"
      says="Where an address is copied, the domain is chosen beside it, the way a clone address's protocol is: once, remembered, the same in every place that copies one. Choose eid.to here and every specimen below follows."
    >
      <Specimen name="one address: <Address /> (the share menu)">
        <div className="max-w-80">
          <Address path={`/${ADA}`} />
        </div>
      </Specimen>
      <Specimen name="many addresses: <AddressFormPicker /> over the list (your short links)">
        <div className="flex flex-col gap-3">
          <AddressFormPicker className="self-end" />
          <ShortLinksSpecimen username={ADA} />
        </div>
      </Specimen>
      <Specimen name="the card's own address: always 👤.to, as it shows (components/copy-address)">
        <p className="text-foreground/60 text-sm">
          The card shows <EmojiDomain path={`/${ADA}`} /> and copies what it
          shows. Choosing a domain belongs to the places that offer one.
        </p>
      </Specimen>
      <Specimen name="on your X profile: <XProfileGuide /> (share › show me)">
        <div className="max-w-md">
          <XProfileGuide
            holder={{
              username: ADA,
              name: AUTHOR.name,
              image: AUTHOR.avatar,
              x: null,
            }}
          />
        </div>
      </Specimen>
      <Specimen name="where it lands: a post on X">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-foreground/60 text-sm">
              Copied, so with https://: X finds the link and shows it as{" "}
              <EmojiDomain path={`/${ADA}`} />.
            </p>
            <Tweet
              tweet={post(
                "copied",
                urlOf("emoji", `/${ADA}`),
                urlOf("emoji", `/${ADA}`),
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-foreground/60 text-sm">
              Typed bare: X leaves the emoji domain as text, a link to nothing.
              eid.to typed bare is still a link.
            </p>
            <Tweet tweet={post("bare", `👤.to/${ADA}`)} />
            <Tweet
              tweet={post("short", `eid.to/${ADA}`, urlOf("short", `/${ADA}`))}
            />
          </div>
        </div>
      </Specimen>
    </Section>
  )
}
