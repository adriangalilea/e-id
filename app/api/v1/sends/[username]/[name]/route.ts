import { answer, fail } from "@/lib/api"
import { SendOut } from "@/lib/api-schemas"
import { readSend } from "@/lib/sends"

// A send, as `eid get eid.to/you/<name>` asks for it: its ticket and its file,
// the open counted (lib/sends). No key: whoever the sender gave the address to
// receives it, account or not.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string; name: string }> },
) {
  const { username, name } = await params
  const send = await readSend(username, name)
  if (!send)
    return fail(404, {
      code: "not_found",
      message: `Nothing is being sent at ${username}/${name}: the sender stopped, or never started.`,
    })
  return answer(SendOut, { from: username, slug: name.toLowerCase(), ...send })
}
