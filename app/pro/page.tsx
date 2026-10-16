import { eq } from "drizzle-orm"
import type { Metadata } from "next"
import { Suspense } from "react"
import { AskForPro } from "@/app/pro/ask"
import { db } from "@/db"
import { proInterest } from "@/db/schema"
import { getSession } from "@/lib/session"

// WHAT IS FREE AND WHAT PRO WILL BE (README, Premium): the line said plainly
// before anything costs money, and a way to be told when Pro opens, which is
// also how e-ID learns whether to build billing at all. Free is everything that
// makes e-ID spread and costs it nearly nothing per person; Pro is what costs
// money per person, what is scarce, and what only heavy use needs. Safety,
// privacy and getting a file someone sends you are never behind it.

export const metadata: Metadata = {
  title: "pro",
  description: "What e-ID keeps free, and what Pro will be.",
  alternates: { canonical: "/pro" },
}

const FREE = [
  "Your card and page, on 👤.to, eid.to and e-id.to",
  "Every link by name, your card as a contact, as data, embedded",
  "Short links, 200 once your account has earned them",
  "Every link checked, and a preview for anyone who wants to look first",
  "Sending files from your machine, and getting them, with no account",
  "The CLI and the API: 60 writes a minute, 1000 a day",
]

const PRO = [
  ["Kept files", "a file that stays when your laptop sleeps, 10 GB"],
  ["Your own domain", "your card at an address of yours"],
  ["Your numbers in full", "visits per day, where they came from, countries"],
  ["No waiting", "200 links of your own from the first day, higher API limits"],
  ["you@eid.to", "an address that reaches you without showing yours"],
] as const

const ONCE = [
  ["A short username", "3 or 4 characters"],
  ["More usernames", "each a lasting redirect to your page"],
] as const

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-4 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl">e-ID Pro</h1>
        <p className="text-foreground/60">
          Not open yet. What is free stays free; Pro is for what costs e-ID
          money to give you, or is scarce.
        </p>
      </header>
      <section className="flex flex-col gap-3">
        <h2 className="text-foreground/60 text-sm">free, always</h2>
        <ul className="flex flex-col gap-2">
          {FREE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-foreground/60 text-sm">
          Pro, about €4 a month or €36 a year
        </h2>
        <ul className="flex flex-col gap-2">
          {PRO.map(([what, says]) => (
            <li key={what}>
              {what}
              <span className="text-foreground/50">: {says}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-foreground/60 text-sm">once, not a subscription</h2>
        <ul className="flex flex-col gap-2">
          {ONCE.map(([what, says]) => (
            <li key={what}>
              {what}
              <span className="text-foreground/50">: {says}</span>
            </li>
          ))}
        </ul>
      </section>
      <Suspense fallback={null}>
        <Ask />
      </Suspense>
      <p className="text-foreground/40 text-xs">
        Prices are the plan, not yet a promise. Never behind Pro: the checks
        that keep links safe, your privacy, and getting a file someone sends
        you.
      </p>
    </main>
  )
}

async function Ask() {
  const session = await getSession()
  if (!session) return <AskForPro asked={null} />
  const [row] = await db
    .select({ at: proInterest.created_at })
    .from(proInterest)
    .where(eq(proInterest.user_id, session.user.id))
  return <AskForPro asked={Boolean(row)} />
}
