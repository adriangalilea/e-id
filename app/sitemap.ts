import type { MetadataRoute } from "next"
import { PROD_URL } from "@/lib/const"
import { getUsernames } from "@/lib/data"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const usernames = await getUsernames()
  return [
    { url: PROD_URL, changeFrequency: "weekly", priority: 1 },
    ...usernames.map((username) => ({
      url: `${PROD_URL}/${username}`,
      changeFrequency: "weekly" as const,
      priority: 1,
    })),
  ]
}
