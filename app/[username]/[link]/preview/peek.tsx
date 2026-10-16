"use client"

import { useState, useTransition } from "react"
import { SubjectHead } from "@/components/subject"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { peekSendAt } from "@/db/actions"
import { bytes } from "@/lib/bytes"

// A SEND BEHIND A PASSWORD, ON ITS PAGE: the password said here shows what the file
// is before anyone takes it (db/actions `peekSendAt`, held to a few tries a caller),
// in the page's own head, where a public send's file stands. The ticket is never
// given here: `eid get` asks for the password again and takes the file.

export function Peek({
  at,
  says,
  username,
  slug,
}: {
  at: string
  says: string
  username: string
  slug: string
}) {
  const [password, setPassword] = useState("")
  const [why, setWhy] = useState<string | null>(null)
  const [file, setFile] = useState<{ name: string; size: number } | null>(null)
  const [pending, start] = useTransition()
  if (file)
    return (
      <SubjectHead at={at} says={says} under={bytes(file.size)}>
        {file.name}
      </SubjectHead>
    )
  return (
    <div className="flex flex-col gap-6">
      <SubjectHead
        at={at}
        says={says}
        under="its name and size, for whoever says the password"
      >
        a file, behind a password
      </SubjectHead>
      <form
        className="flex max-w-md flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const peek = await peekSendAt(username, slug, password)
            if (peek.ok) setFile(peek.file)
            else setWhy(peek.why)
          })
        }}
      >
        <div className="flex gap-2">
          <Input
            size="lg"
            className="min-w-0 grow"
            type="password"
            aria-label="password"
            placeholder="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            size="lg"
            loading={pending}
            disabled={!password}
          >
            show
          </Button>
        </div>
        {why && <span className="text-destructive text-sm">{why}</span>}
      </form>
    </div>
  )
}
