import { z } from "zod"
import "@/lib/api-schemas"
import { PROD_URL } from "@/lib/const"

// E-ID'S API AS OPENAPI 3.1 (app/api/v1/openapi.json): the components are the
// schemas the routes validate and answer with (lib/api-schemas, each with its
// `.meta({ id })`, which zod keeps in its global registry), so the document is
// the code; the operations are the table below, one row per route, each naming
// those schemas by id. A route added without a row here is a route nobody can
// find: the row is part of adding it.

type Op = {
  method: "get" | "post" | "patch" | "put" | "delete"
  path: string
  summary: string
  /** Needs `Authorization: Bearer eid_…`. */
  key: boolean
  body?: string
  /** The answer's schema id, or null for 204. */
  ok: string | null
  status?: number
  /** Path parameters. */
  params?: string[]
}

const OPS: Op[] = [
  {
    method: "post",
    path: "/login",
    summary: "Begin signing a machine in (RFC 8628 device flow)",
    key: false,
    body: "LoginStart",
    ok: "LoginStarted",
  },
  {
    method: "post",
    path: "/login/token",
    summary: "Ask after a sign-in: the key once approved at /cli",
    key: false,
    body: "LoginToken",
    ok: "LoggedIn",
  },
  {
    method: "delete",
    path: "/key",
    summary: "Revoke the key this request carries (eid logout)",
    key: true,
    ok: null,
  },
  {
    method: "get",
    path: "/me",
    summary: "Whose key this is, and their address on every domain",
    key: true,
    ok: "Me",
  },
  {
    method: "get",
    path: "/links",
    summary: "Your short links and sends, and how many you may keep",
    key: true,
    ok: "Links",
  },
  {
    method: "post",
    path: "/links",
    summary: "Make a short link",
    key: true,
    body: "LinkCreate",
    ok: "ShortLink",
    status: 201,
  },
  {
    method: "delete",
    path: "/links/{name}",
    summary: "Delete a short link or end a send",
    key: true,
    ok: null,
    params: ["name"],
  },
  {
    method: "post",
    path: "/sends",
    summary:
      "Name a file served from your machine (eid send): public, behind a password, or for people",
    key: true,
    body: "SendCreate",
    ok: "SendMade",
    status: 201,
  },
  {
    method: "get",
    path: "/sends/{username}/{name}",
    summary:
      "A send's ticket, file and sender, for eid get: no key for a public send, the e-id-password header for one behind a password, one of its people's keys for one sent to them",
    key: false,
    ok: "Send",
    params: ["username", "name"],
  },
  {
    method: "post",
    path: "/sends/{username}/{name}/taken",
    summary:
      "Say you have the file of a send sent to you: it leaves your inbox, its sender sees when",
    key: true,
    ok: null,
    params: ["username", "name"],
  },
  {
    method: "get",
    path: "/inbox",
    summary:
      "Sends for you, waiting; ?wait=<s> (25 at most) holds the answer until one arrives after ?after=<ISO>",
    key: true,
    ok: "Inbox",
  },
  {
    method: "get",
    path: "/stats",
    summary: "Your numbers: visits, links opened",
    key: true,
    ok: "Stats",
  },
  {
    method: "get",
    path: "/card",
    summary: "Your card as you edit it",
    key: true,
    ok: "MyCard",
  },
  {
    method: "patch",
    path: "/card",
    summary: "Change your card's name, bio, country or vouches",
    key: true,
    body: "CardPatch",
    ok: "MyCard",
  },
  {
    method: "put",
    path: "/card/links/{platform}",
    summary: "Set a platform's link on your card",
    key: true,
    body: "CardLinkPut",
    ok: "MyCard",
    params: ["platform"],
  },
  {
    method: "delete",
    path: "/card/links/{platform}",
    summary: "Take a platform's link off your card",
    key: true,
    ok: "MyCard",
    params: ["platform"],
  },
]

const ref = (id: string) => ({ $ref: `#/components/schemas/${id}` })
const json = (id: string) => ({ "application/json": { schema: ref(id) } })

export function openApi() {
  const all = z.toJSONSchema(z.globalRegistry, {
    target: "draft-2020-12",
    uri: (id) => `#/components/schemas/${id}`,
  }) as { schemas: Record<string, Record<string, unknown>> }
  // Each comes as a document of its own; inside OpenAPI's components its
  // `$schema` and `$id` say nothing the document does not.
  const schemas = Object.fromEntries(
    Object.entries(all.schemas).map(([id, { $schema, $id, ...schema }]) => [
      id,
      schema,
    ]),
  )
  for (const op of OPS)
    for (const id of [op.body, op.ok, "Error"])
      if (id && !schemas[id])
        throw new Error(
          `openapi: ${op.method} ${op.path} names ${id}, no schema has that id`,
        )
  const paths: Record<string, Record<string, unknown>> = {}
  for (const op of OPS) {
    paths[op.path] ??= {}
    const path = paths[op.path] as Record<string, unknown>
    path[op.method] = {
      summary: op.summary,
      ...(op.key ? { security: [{ key: [] }] } : { security: [] }),
      ...(op.params && {
        parameters: op.params.map((name) => ({
          name,
          in: "path",
          required: true,
          schema: { type: "string" },
        })),
      }),
      ...(op.body && {
        requestBody: { required: true, content: json(op.body) },
      }),
      responses: {
        [String(op.ok ? (op.status ?? 200) : 204)]: op.ok
          ? { description: op.ok, content: json(op.ok) }
          : { description: "done" },
        default: { description: "refused", content: json("Error") },
      },
    }
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "e-ID",
      version: "1",
      description:
        "Your e-ID from a program: short links, sends, your card, your numbers. A key comes from `eid login` (the OAuth device flow); every refusal is an Error. Writes: 60 a minute and 1000 a day a key.",
    },
    servers: [{ url: `${PROD_URL}/api/v1` }],
    components: {
      schemas,
      securitySchemes: {
        key: { type: "http", scheme: "bearer", bearerFormat: "eid_…" },
      },
    },
    paths,
  }
}
