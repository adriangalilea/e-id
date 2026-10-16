import { answer, fail } from "@/lib/api"
import { keyHolder } from "@/lib/api-keys"
import { SendOut } from "@/lib/api-schemas"
import { readSend } from "@/lib/sends"

// A send, as `eid get eid.to/you/<name>` asks for it: its ticket, its file and who
// sends it, the open counted (lib/sends). No key needed for a public send; a send
// behind a password needs it said (the `e-id-password` header, never the address,
// which logs keep); a send for people needs one of their keys, and to anyone else is
// not found, the same answer as a send that stopped.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string; name: string }> },
) {
  const { username, name } = await params
  const who = await keyHolder(request)
  const send = await readSend(username, name, {
    userId: who?.userId ?? null,
    password: request.headers.get("e-id-password"),
  })
  if (!send.ok && send.why === "password")
    return fail(401, {
      code: "password",
      message: `${username}/${name} is behind a password: say it (eid get … --password).`,
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
