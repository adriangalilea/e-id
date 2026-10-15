import type { Metadata } from "next"
import Link from "next/link"
import { CONTACT, LEGAL_UPDATED } from "@/lib/legal"

// THE RULES OF USING E-ID, short: who may, what they may not put on it, what e-ID
// may do about it, and what it promises (little).

export const metadata: Metadata = {
  title: "terms",
  description: "The rules of using e-ID.",
  alternates: { canonical: "/terms" },
}

export default function Page() {
  return (
    <main className="prose prose-invert mx-auto w-full max-w-2xl px-4 py-12">
      <h1>Terms</h1>
      <p>
        Updated {LEGAL_UPDATED}. e-ID is run by Adrian Galilea, in Spain. By
        making an account you agree to these terms; questions to{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>Who can use it</h2>
      <p>People 16 and older, one account each, as themselves.</p>

      <h2>What you put on it</h2>
      <p>
        Your page, links and vouches are yours, and public: you let e-ID show
        them, on your page, in its card formats and embeds, and in the previews
        other sites make of your address. You are responsible for them. Not
        allowed: pretending to be someone else, links to scams, malware or
        phishing, anything illegal, and vouches that harass or lie about people.
      </p>

      <h2>Addresses</h2>
      <p>
        Your address (username) is yours to use, not to own. e-ID reserves its
        own names, and can take back an address that impersonates someone or
        infringes a name they hold. An address left by a deleted account is held
        from anyone else for 90 days.
      </p>

      <h2>What e-ID can do</h2>
      <p>
        Remove content or accounts that break these terms, and change or end the
        service. If it ends, you will be told in time to take your card with you
        (<code>/you/card.json</code>).
      </p>

      <h2>No promises</h2>
      <p>
        e-ID is offered as it is, free, without guarantees that it will always
        be available or free of errors, and is liable only as far as the law
        does not allow it to exclude. Spanish law applies.
      </p>

      <p>
        How your data is handled: <Link href="/privacy">privacy</Link>.
      </p>
    </main>
  )
}
