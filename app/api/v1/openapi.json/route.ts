import { openApi } from "@/lib/openapi"

// E-ID'S API, described (lib/openapi): generated from the schemas the routes
// validate and answer with, so it is the API as it runs. Open to every origin.

export function GET() {
  return Response.json(openApi(), {
    headers: { "access-control-allow-origin": "*" },
  })
}
