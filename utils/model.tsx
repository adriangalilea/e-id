import { z } from "zod";

export const userProfileSchema1 = z.object({
  version: z.literal("1"),
  name: z.string(),
  bio: z.string(),
  personalSite: z.string().optional(),
  email: z.string().email(),
  telegramLink: z.string().optional(),
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
  facebookHandle: z.string().optional(),
  linkedInHandle: z.string().optional(),
  other: z.array(z.string()).optional(),
});

export type UserProfile1 = z.infer<typeof userProfileSchema1>;
