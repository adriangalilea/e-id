"use client"

import { useEffect, useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ownStats, type OwnStats as Stats } from "@/db/actions"

// THE OWNER'S NUMBERS, under their card's actions: how many visits read their page
// and how many links their addresses opened, all time. An admin presses them for the
// last 30 days in full. Asked of the server once the owner is known (a public page
// prerenders with no session); nothing while visits are off.

const fmt = new Intl.NumberFormat("en")

export function OwnStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => {
    void ownStats().then(setStats)
  }, [])
  if (!stats) return null
  const line = (
    <span className="font-mono text-muted-foreground text-xs">
      {fmt.format(stats.views)} {stats.views === 1 ? "visit" : "visits"} ·{" "}
      {fmt.format(stats.hits)} {stats.hits === 1 ? "link" : "links"} opened
    </span>
  )
  if (!stats.detail) return <p className="animate-fade-in">{line}</p>
  const { days, opened, referrers, countries } = stats.detail
  const most = Math.max(1, ...days.map((d) => d.views))
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="animate-fade-in cursor-pointer hover:underline"
          />
        }
      >
        {line}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-4 p-4 text-sm">
        <section>
          <h3 className="mb-2 text-muted-foreground text-xs">
            visits, last 30 days
          </h3>
          <div className="flex h-12 items-end gap-px">
            {days.map((d) => (
              <div
                key={d.day}
                title={`${d.day}: ${d.views}`}
                className="flex-1 rounded-xs bg-foreground/60"
                style={{ height: `${(d.views / most) * 100}%` }}
              />
            ))}
          </div>
        </section>
        <Counts
          title="names opened"
          rows={opened.map((o) => [
            o.opened ? `/${o.name}` : `/${o.name} (nothing)`,
            o.hits,
          ])}
        />
        <Counts
          title="from"
          rows={referrers.map((r) => [
            r.referrer ?? "direct or e-ID",
            r.visits,
          ])}
        />
        <Counts
          title="countries"
          rows={countries.map((c) => [c.country ?? "unknown", c.visits])}
        />
      </PopoverContent>
    </Popover>
  )
}

function Counts({
  title,
  rows,
}: {
  title: string
  rows: readonly (readonly [string, number])[]
}) {
  if (rows.length === 0) return null
  return (
    <section>
      <h3 className="mb-1 text-muted-foreground text-xs">{title}</h3>
      <ul className="font-mono text-xs">
        {rows.slice(0, 8).map(([label, n]) => (
          <li key={label} className="flex justify-between gap-4">
            <span className="truncate">{label}</span>
            <span>{fmt.format(n)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
