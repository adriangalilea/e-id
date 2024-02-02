import { z } from "zod";

export const orderedKeys1: (keyof UserProfile1)[] = [
  "version",
  "name",
  "bio",
  "personalSite",
  "email",
  "telegramHandle",
  "twitterHandle",
  "instagramHandle",
  "facebookHandle",
  "linkedInHandle",
  "other",
];

export const userProfileSchema1 = z.object({
  version: z.literal("1"),
  name: z.string(),
  bio: z
    .string()
    .max(280, { message: "Bio cannot exceed 280 characters" })
    .regex(/^[^;]*$/, { message: "Bio cannot contain semicolons (;)" })
    .optional(),
  personalSite: z.string().url().or(z.literal("")).optional(),
  email: z.string().email().or(z.literal("")).optional(),
  telegramHandle: z.string().optional(),
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
  facebookHandle: z.string().optional(),
  linkedInHandle: z.string().optional(),
  other: z.string().url().or(z.literal("")).optional(),
});

// handling "@" prefix in handles and using a custom resolver for validation
export const normalizeHandle = (handle: string) => handle.replace(/^@/, "");

export type UserProfile1 = z.infer<typeof userProfileSchema1>;
