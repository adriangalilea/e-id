import { withKey } from "@/lib/api"
import { revokeKey } from "@/lib/api-keys"

// The key this request carries: `DELETE` revokes it, what `eid logout` does.
// Every other key of yours is listed and revoked at /cli.

export const DELETE = withKey(async (_request, { userId, keyId }) => {
  if (!(await revokeKey(userId, keyId)))
    throw new Error(`DELETE /key: ${keyId} of ${userId} went missing`)
  return new Response(null, { status: 204 })
})
