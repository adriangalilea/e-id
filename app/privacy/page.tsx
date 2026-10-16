import type { Metadata } from "next"
import Link from "next/link"
import { EMOJI_DOMAIN } from "@/lib/const"
import { CONTACT, LEGAL_UPDATED } from "@/lib/legal"

// WHAT E-ID KEEPS ABOUT PEOPLE, AND WHY (GDPR art. 13), as plainly as it can be
// said. It must stay true to the code: each paragraph names what holds the data it
// describes, and a change there is a change here (README, Decisions).

export const metadata: Metadata = {
  title: "privacy",
  description: "What e-ID keeps about you, why, for how long, and your rights.",
  alternates: { canonical: "/privacy" },
}

export default function Page() {
  return (
    <main className="prose prose-invert mx-auto w-full max-w-2xl px-4 py-12">
      <h1>Privacy</h1>
      <p>
        Updated {LEGAL_UPDATED}. e-ID ({EMOJI_DOMAIN}, e-id.to, eid.to) is run
        by Adrian Galilea, in Spain, who decides what is done with your data
        (the controller). Write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>{" "}
        for anything on this page.
      </p>

      <h2>What e-ID keeps, and why</h2>
      <h3>Your account</h3>
      <p>
        When you sign in with GitHub or Google, e-ID receives your email, your
        name, your picture and your id there. You add the rest: your address
        (username), a line about you, your country, your links and their notes.
        This is needed to give you an account and your page (the contract
        between us). Your page and card are public by design: anyone, search
        engines included, can see what you put on them, and read them as data (
        <code>/you/card.json</code>, <code>.vcf</code>, <code>.svg</code>).
      </p>
      <p>
        To sign you in, a session is kept: a random token and its dates, in a
        cookie and in the database. Not your IP address, not your browser. The
        token GitHub or Google gives e-ID is used once, when you link them, to
        read your public profile there, and then discarded.
      </p>
      <h3>Vouches</h3>
      <p>
        A vouch you write is shown with your name and picture on the page you
        wrote it on, if its owner pins it. You can remove it at any time, and so
        can the page's owner.
      </p>
      <h3>Visits</h3>
      <p>
        e-ID counts its own visits, with no third party and no cookie: which
        pages were seen, how a page was reached (the site you came from), your
        country, the size of your screen, how fast the page loaded, and which of
        a person's short links (<code>/you/gh</code>) were opened. To tell one
        visit from another within a day, your IP address and browser are mixed
        with a secret that changes every day and is then deleted, so nobody,
        e-ID included, can recognise you on another day. Your IP address and
        browser are never stored. Owners see only totals for their pages, never
        anyone&apos;s visit. This is e-ID&apos;s legitimate interest in knowing
        how it is used; you can object by writing to the address above.
      </p>
      <h3>Previews of your links</h3>
      <p>
        To show what is behind your links (your GitHub profile, your
        website&apos;s title, a video, a post), e-ID reads those public pages
        from GitHub, Telegram, YouTube, X and your website, and keeps what it
        read for a day.
      </p>
      <h3>Checking where your links go</h3>
      <p>
        So e-ID&apos;s addresses never lead to phishing or malware, the address
        your website and your own links point to is checked with Google&apos;s
        Web Risk when you save it and once a day after. Only that address is
        sent, nothing about you. A link Google lists stops opening and leaves
        your card. This is e-ID&apos;s legitimate interest in keeping its
        addresses safe for everyone who opens them.
      </p>

      <h2>How long</h2>
      <ul>
        <li>Your account and page: until you delete them.</li>
        <li>
          Visits: 180 days (each page&apos;s events, 30 days); after that only
          daily counts per page and per person, with nothing about who.
        </li>
        <li>
          When you delete your account, everything above goes at once, including
          your counts. Your address and your old ones are held from anyone else
          for 90 days, so links to them open nobody else&apos;s page; nothing
          else of yours is kept. The vouches you wrote on other people&apos;s
          pages stay there, signed by &ldquo;a former e-ID member&rdquo;, with
          no name or picture.
        </li>
      </ul>

      <h2>Who else handles it</h2>
      <ul>
        <li>
          Vercel (hosting, United States): every page is served by it. Data
          leaves the EU under the EU-US Data Privacy Framework and the European
          Commission&apos;s standard contractual clauses.
        </li>
        <li>Turso (the databases, in Ireland).</li>
        <li>GitHub and Google, when you sign in with them.</li>
        <li>
          Google Web Risk: the addresses your links point to, to be checked.
        </li>
      </ul>
      <p>e-ID sells nothing and shows no ads.</p>

      <h2>Cookies</h2>
      <p>
        Two, both only when you sign in: the session, which keeps you signed in,
        and one with your address and picture so the page can show who you are.
        Nothing that follows you, so there is nothing to consent to.
      </p>

      <h2>Your rights</h2>
      <p>
        You can see, correct, take away or delete your data, restrict its use or
        object to it. Most of it you can do yourself: edit your card, delete
        your account from the account menu, and take your data with you:
        everything on your card is at <code>/you/json</code> (your name,
        address, country, the line about you, your links and their notes). What
        is not in it (your account&apos;s email, the vouches you wrote, the
        numbers of your page) is yours too: write to{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a> for it, or for anything else
        on this page, and you get an answer within a month. You can also
        complain to the Spanish data protection authority, the{" "}
        <a href="https://www.aepd.es">AEPD</a>.
      </p>

      <h2>Age</h2>
      <p>e-ID is for people 16 and older.</p>

      <p>
        See also the <Link href="/terms">terms</Link>.
      </p>
    </main>
  )
}
