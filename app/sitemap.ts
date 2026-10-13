import type { MetadataRoute } from "next";
import { getUsernames } from "@/lib/data";
import { PROD_URL } from "@/lib/const";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const usernames = await getUsernames();
  return [
    { url: PROD_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${PROD_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    ...usernames.map((username) => ({
      url: `${PROD_URL}/${username}`,
      changeFrequency: "weekly" as const,
      priority: 1,
    })),
  ];
}
