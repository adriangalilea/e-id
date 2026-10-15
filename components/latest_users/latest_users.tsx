import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { CountryFlag } from "@/components/country"
import { GUTTER } from "@/components/frame"
import { Panel } from "@/components/ui/panel"
import { RelativeTime } from "@/components/ui/relative-time"
import { getLatestUsers } from "@/lib/data"
import { cn } from "@/lib/utils"

/** The home's latest sign-ups as a ledger on its own panel: a row per person, their
 *  number, flag, name and handle, and when they came. Two columns on a wide screen,
 *  read down the first and then the second; one on a phone. No inner scroller: the
 *  list is the page. */
export async function LatestUsers() {
  const users = await getLatestUsers()
  const rows = Math.ceil(users.length / 2)
  return (
    <section
      aria-labelledby="latest-sign-ups"
      className={cn("mx-auto w-full max-w-6xl py-16 sm:py-20", GUTTER)}
    >
      {/* The site's one box (@ag/panel), in the page's glass: its head the
          ledger's name and count. */}
      <Panel
        head={
          <h2
            id="latest-sign-ups"
            className="font-mono text-foreground/60 text-xs"
          >
            latest sign-ups
          </h2>
        }
        action={
          <span className="font-mono text-foreground/40 text-xs tabular-nums">
            {String(users.length).padStart(2, "0")}
          </span>
        }
        bodyClassName="gap-0 p-0"
        className="overflow-hidden"
      >
        <ol
          style={
            {
              "--latest-rows": `repeat(${rows}, minmax(0, auto))`,
            } as React.CSSProperties
          }
          className="grid lg:grid-flow-col lg:grid-cols-2 lg:grid-rows-(--latest-rows)"
        >
          {users.map((user, index) => (
            <li
              key={user.id}
              className={cn(
                "border-white/[0.07] border-b",
                // The second column's rows carry the rule between the columns.
                index >= rows && "lg:border-l lg:border-l-white/10",
              )}
            >
              <Link
                href={`/${user.username}`}
                className="group grid h-16 grid-cols-[1.75rem_auto_minmax(0,1fr)_auto] items-center gap-3 px-4 transition-colors hover:bg-white/[0.04] sm:gap-4 sm:px-5"
              >
                <span className="font-mono text-[11px] text-foreground/35 tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <CountryFlag
                  country={user.country_code}
                  className="text-[20px]"
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-base leading-tight">
                    {user.name || `@${user.username}`}
                  </span>
                  <span className="truncate font-mono text-[11px] text-foreground/45 leading-tight">
                    @{user.username}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <RelativeTime
                    at={user.createdAt.getTime()}
                    className="font-mono text-[11px] text-foreground/45"
                  />
                  <ArrowUpRight
                    strokeWidth={1.5}
                    aria-hidden
                    className="hidden size-4 -translate-x-1 text-foreground/0 transition-all group-hover:translate-x-0 group-hover:text-foreground/70 sm:block"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </Panel>
    </section>
  )
}
