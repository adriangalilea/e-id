import "server-only";

import { cacheLife } from "next/cache";
import { fetchTweet, type Tweet } from "@/lib/tweet-data";

/** A profile's highlighted post on X, as the registry's `tweet` item draws it,
 *  read once and kept a day (its counts move, its words do not). The id is the
 *  owner's, so a new highlight is a new id and a new entry. A post X will not
 *  give (deleted, private, a shape the item does not draw) leaves the tab
 *  without it, and that answer is kept minutes. */
export async function getTweet(id: string): Promise<Tweet | null> {
  "use cache";
  try {
    const tweet = await fetchTweet(id);
    cacheLife("days");
    return tweet;
  } catch (error) {
    console.error(`highlighted tweet ${id}:`, error);
    cacheLife("minutes");
    return null;
  }
}
