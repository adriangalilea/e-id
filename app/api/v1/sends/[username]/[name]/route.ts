import { answer, fail } from "@/lib/api"
import { keyHolder } from "@/lib/api-keys"
import { SendOut } from "@/lib/api-schemas"
import { readSend } from "@/lib/sends"

// A send, as `eid get eid.to/you/<name>` asks for it: its ticket, its file and who
// sends it, the open counted (lib/sends). No key needed for a public send; a send
// behind a password needs it said (the `e-id-password` header, never the address,
// which logs keep); a send for people needs one of their keys, and to anyone else is
// not found, the same answer as a send that stopped. One whose machine is not
// answering is `away` (409), until it is heard from again. `e-id-again: 1` is the
// same download asking again after its connection dropped: not counted twice.

/** "3 minutes", "2 hours": how long ago, as a sentence says it. */
function since(seen: Date): string {
  const minutes = Math.max(
    1,
    Math.floor((Date.now() - seen.getTime()) / 60_000),
  )
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`
  const hours = Math.round(minutes / 60)
  return `${hours} hour${hours === 1 ? "" : "s"}`
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string; name: string }> },
) {
  const { username, name } = await params
  const who = await keyHolder(request)
  const send = await readSend(
    username,
    name,
    {
      userId: who?.userId ?? null,
      password: request.headers.get("e-id-password"),
    },
    request.headers.get("e-id-again") === "1",
  )
  if (!send.ok && send.why === "password")
    return fail(401, {
      code: "password",
      message: `${username}/${name} is behind a password: say it (eid get … --password).`,
    })
  if (!send.ok && send.why === "away")
    return fail(409, {
      code: "away",
      message: `${username}'s machine has not answered${send.seen ? ` for ${since(send.seen)}` : ""}: the send is paused until it does.`,
    })
  if (!send.ok)
    return fail(404, {
      code: "not_found",
      message: `Nothing is being sent at ${username}/${name}: the sender stopped, or never started.`,
    })
  return answer(SendOut, {
    from: send.from.username,
    fromName: send.from.name,
    slug: name.toLowerCase(),
    ticket: send.ticket,
    file: send.file,
  })
}
