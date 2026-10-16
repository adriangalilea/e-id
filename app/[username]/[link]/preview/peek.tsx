"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { peekSendAt } from "@/db/actions"
import { bytes } from "@/lib/bytes"

// A SEND BEHIND A PASSWORD, ON ITS PAGE: the password said here shows what the file
// is and who sends it before anyone takes it (db/actions `peekSendAt`, held to a few
// tries a caller). The ticket is never given here: `eid get` asks for the password
// again and takes the file.

export function Peek({ username, slug }: { username: string; slug: string }) {
  const [password, setPassword] = useState("")
  const [why, setWhy] = useState<string | null>(null)
  const [file, setFile] = useState<{ name: string; size: number } | null>(null)
  const [pending, start] = useTransition()
  if (file)
    return (
      <>
        <span className="break-all font-medium text-lg">{file.name}</span>
        <span className="text-foreground/50 text-xs">{bytes(file.size)}</span>
      </>
    )
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const peek = await peekSendAt(username, slug, password)
          if (peek.ok) setFile(peek.file)
          else setWhy(peek.why)
        })
      }}
    >
      <span className="font-medium text-lg">a file, behind a password</span>
      <span className="text-foreground/50 text-xs">
        Say it to see what it is before you take it.
      </span>
      <div className="flex gap-2">
        <Input
          type="password"
          aria-label="password"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" loading={pending} disabled={!password}>
          show
        </Button>
      </div>
      {why && <span className="text-destructive text-sm">{why}</span>}
    </form>
  )
}
