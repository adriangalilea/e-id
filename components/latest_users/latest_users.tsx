import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RelativeTime } from "@/components/ui/relative-time";
import { CountryCode } from "@/components/country";
import { getLatestUsers } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Scroller } from "./scroller";

/** The home's latest sign-ups: one row per person, their country, name and handle,
 *  and when they came. On a wide screen the list fills its column and scrolls in
 *  it, wearing the registry's thumbs; on a phone it is part of the page. */
export async function LatestUsers({ className }: { className?: string }) {
  const users = await getLatestUsers();
  return (
    <section
      aria-labelledby="latest-sign-ups"
      className={cn("flex flex-col border border-border bg-card", className)}
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <h2
          id="latest-sign-ups"
          className="font-mono text-xs text-foreground/60"
        >
          latest sign-ups
        </h2>
        <span className="font-mono text-xs text-foreground/40 tabular-nums">
          {String(users.length).padStart(2, "0")}
        </span>
      </header>
      <div className="relative flex-1">
        <Scroller className="lg:absolute lg:inset-0 lg:overflow-y-auto">
          <ol>
            {users.map((user, index) => (
              <li key={user.id} className="border-b border-border last:border-b-0">
                <Link
                  href={`/${user.username}`}
                  className="group grid h-14 grid-cols-[1.5rem_2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 transition-colors hover:bg-foreground/5 sm:gap-4"
                >
                  <span className="font-mono text-[11px] text-foreground/30 tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <CountryCode country={user.country_code} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] leading-tight">
                      {user.name || `@${user.username}`}
                    </span>
                    <span className="truncate font-mono text-[11px] leading-tight text-foreground/45">
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
                      className="hidden size-4 -translate-x-1 text-foreground/0 sm:block transition-all group-hover:translate-x-0 group-hover:text-foreground/70"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Scroller>
      </div>
    </section>
  );
}
