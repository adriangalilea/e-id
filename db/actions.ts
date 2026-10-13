"use server";

import { and, desc, eq, not } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  comments,
  socials,
  users,
  type SelectComment,
  type SelectSocial,
  type SocialPlatform,
  socialPlatforms,
} from "@/db/schema";
import type { Written } from "@/lib/draft";
import { hasFlag } from "@/components/ui/flag";
import { type Chip, chipOf } from "@/lib/chip";
import { writeChip } from "@/lib/chip-server";
import { getSession } from "@/lib/session";
import { USERS_TAG, profileTag, usernameTag } from "@/lib/tags";
import { claimUsername, usernameSchema } from "@/lib/username";

// Every export here is an endpoint anyone can call with any arguments: each one
// reads the session itself and acts only on what that user owns. A profile's
// public page is prerendered, so a write that changes it expires its tag
// (lib/tags) with updateTag.

const SIGNED_OUT = "You are not signed in.";

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error(SIGNED_OUT);
  return session.user;
}

// ── comments ────────────────────────────────────────────────────────────────

export type ThreadComment = {
  commentId: string;
  body: string;
  createdAt: Date;
  pinned: boolean;
  user: { name: string | null; image: string | null; username: string | null };
};

export type CommentThread = {
  viewer: Chip;
  isOwner: boolean;
  comments: ThreadComment[];
};

/** The signed-in side of a profile's comments: every comment on it for its
 *  owner, the viewer's own for anyone else, so the viewer may remove each one.
 *  Null when signed out. */
export async function loadComments(
  profileUserId: string,
): Promise<CommentThread | null> {
  const session = await getSession();
  if (!session) return null;
  const viewer = session.user;
  const isOwner = viewer.id === profileUserId;

  const rows = await db
    .select({
      commentId: comments.id,
      body: comments.body,
      createdAt: comments.created_at,
      pinned: comments.pinned,
      name: users.name,
      image: users.image,
      username: users.username,
    })
    .from(comments)
    .innerJoin(users, eq(comments.commentator_id, users.id))
    .where(
      isOwner
        ? eq(comments.profile_user_id, profileUserId)
        : and(
            eq(comments.profile_user_id, profileUserId),
            eq(comments.commentator_id, viewer.id),
          ),
    )
    .orderBy(desc(comments.created_at));

  return {
    viewer: chipOf(viewer),
    isOwner,
    comments: rows.map((row) => ({
      commentId: row.commentId,
      body: row.body,
      createdAt: row.createdAt,
      pinned: row.pinned,
      user: { name: row.name, image: row.image, username: row.username },
    })),
  };
}

export type CommentFormState = { resetKey: string; error: string | null };

export async function createComment(
  profileUserId: string,
  prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const session = await getSession();
  if (!session) return { ...prevState, error: SIGNED_OUT };
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ...prevState, error: "Comment can't be empty" };

  const [profile] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, profileUserId));
  if (!profile) return { ...prevState, error: "That profile does not exist." };

  await db.insert(comments).values({
    id: crypto.randomUUID(),
    profile_user_id: profileUserId,
    commentator_id: session.user.id,
    body,
  });
  return { resetKey: crypto.randomUUID(), error: null };
}

async function commentOf(id: SelectComment["id"]) {
  const [comment] = await db.select().from(comments).where(eq(comments.id, id));
  if (!comment) throw new Error(`no comment ${id}`);
  return comment;
}

export async function deleteComment(id: SelectComment["id"]) {
  const user = await requireUser();
  const comment = await commentOf(id);
  if (
    comment.commentator_id !== user.id &&
    comment.profile_user_id !== user.id
  )
    throw new Error("Only its author or the profile's owner can remove a comment.");

  await db.delete(comments).where(eq(comments.id, id));
  if (comment.pinned) updateTag(profileTag(comment.profile_user_id));
}

export async function pinCommentToggle(id: SelectComment["id"]) {
  const user = await requireUser();
  const comment = await commentOf(id);
  if (comment.profile_user_id !== user.id)
    throw new Error("Only the profile's owner can pin a comment.");

  await db
    .update(comments)
    .set({ pinned: not(comments.pinned) })
    .where(eq(comments.id, id));
  updateTag(profileTag(user.id));
}

// ── profile ─────────────────────────────────────────────────────────────────

export type FormState = { message: string; error: boolean };

/** Claims a username for the signed-in user and points every cache and the
 *  display cookie at it. */
async function renameTo(
  user: { id: string; image?: string | null },
  username: string,
): Promise<string> {
  const valid = await claimUsername(user.id, username);
  updateTag(USERS_TAG);
  updateTag(profileTag(user.id));
  updateTag(usernameTag(valid));
  await writeChip(chipOf({ username: valid, image: user.image }));
  return valid;
}

function renameError(error: unknown): FormState {
  const message = error instanceof Error ? error.message : String(error);
  if (/unique/i.test(message))
    return { message: "The username is taken", error: true };
  return { message, error: true };
}

type SocialFields = {
  platform: SocialPlatform;
  value?: string;
  public?: boolean;
  contextmessage?: string;
  highlight?: string;
};

/** The edit form's socials, keyed `<platform>_<socialId>_<field>`. */
function socialsOf(formData: FormData) {
  const entries = new Map<string, SocialFields>();
  for (const [key, value] of formData.entries()) {
    const [platform, socialId, field] = key.split("_");
    if (!platform || !socialId || !field) continue;
    const entry = entries.get(socialId) ?? {
      platform: platform as SocialPlatform,
    };
    entries.set(socialId, entry);
    if (field === "value") entry.value = value.toString();
    else if (field === "public") entry.public = Boolean(value);
    else if (field === "contextmessage") entry.contextmessage = value.toString();
    else if (field === "highlight") entry.highlight = value.toString();
  }
  return entries;
}

export async function updateUserAndSocials(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const name = String(formData.get("name"));
  const username = String(formData.get("username"));
  const bio = String(formData.get("bio"));
  const country_code = String(formData.get("country_code"));

  const [updated] = await db
    .update(users)
    .set({ name, bio, country_code })
    .where(eq(users.id, user.id))
    .returning({ username: users.username });
  if (!updated) throw new Error(`no user ${user.id}`);

  // Only the signed-in user's own socials are written: a social id from the form
  // that is not theirs matches no row.
  for (const [socialId, social] of socialsOf(formData)) {
    await db
      .update(socials)
      .set({
        value: social.value ?? "",
        public: social.public ?? false,
        context_message: social.contextmessage || null,
        custom_data: social.highlight ? { highlight: social.highlight } : {},
      })
      .where(and(eq(socials.id, socialId), eq(socials.user_id, user.id)));
  }

  updateTag(USERS_TAG);
  updateTag(profileTag(user.id));

  let finalUsername = updated.username;
  if (username !== updated.username) {
    try {
      finalUsername = await renameTo(user, username);
    } catch (error) {
      return renameError(error);
    }
  }
  if (!finalUsername) throw new Error(`user ${user.id} edited without a username`);
  redirect(`/${finalUsername}`);
}

export async function setUsernameFromForm(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  try {
    await renameTo(user, String(formData.get("username")));
  } catch (error) {
    return renameError(error);
  }
  return { message: "Username updated.", error: false };
}

export type HandleState = "free" | "taken" | "invalid";

/** Whether a handle can be someone's new address, as the home's card asks while
 *  it is typed: free, taken, or not a username at all (`invalid`, with why).
 *  Public: whether an address is taken is what its page already says. */
export async function handleState(
  handle: string,
): Promise<{ state: HandleState; why: string | null }> {
  const parsed = usernameSchema.safeParse(handle);
  if (!parsed.success)
    return { state: "invalid", why: parsed.error.issues[0].message };
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username_normalized, parsed.data.toLowerCase()));
  return { state: taken ? "taken" : "free", why: null };
}

/** How new an account must be to take a card filled on the home: the sign-in
 *  that made it has just come back. Older, it is someone signing in again with a
 *  card left in their browser, and their profile is not written over. */
const FRESH_MS = 10 * 60 * 1000;

export type Claimed = {
  /** null: none could be given (the drafted one and the provider's both taken). */
  username: string | null;
  /** The account was not new, so nothing was written. */
  stale: boolean;
  /** Why the drafted handle could not be the username (taken, too short). */
  refused: string | null;
};

/** The card a visitor filled on the home (lib/draft), written onto the account
 *  they just signed up with: the name, the country, a place for each one they
 *  pressed (private and empty, for the edit page to fill) and the handle as the
 *  username. */
export async function claimDraft(draft: Written): Promise<Claimed> {
  const user = await requireUser();
  const [row] = await db
    .select({ createdAt: users.createdAt, username: users.username })
    .from(users)
    .where(eq(users.id, user.id));
  if (!row) throw new Error(`claimDraft: no user ${user.id}`);
  if (Date.now() - row.createdAt.getTime() > FRESH_MS)
    return { username: row.username, stale: true, refused: null };

  const name = draft.name.trim();
  // Any country the picker offers (@ag/country-picker draws the flag set's); "XX"
  // for none, which has no flag.
  const country = hasFlag(draft.country) ? draft.country.toUpperCase() : "XX";
  await db
    .update(users)
    .set({ ...(name && { name }), country_code: country })
    .where(eq(users.id, user.id));

  const owned = await db
    .select({ platform: socials.platform })
    .from(socials)
    .where(eq(socials.user_id, user.id));
  const added = socialPlatforms.filter(
    (p) => draft.places.includes(p) && !owned.some((s) => s.platform === p),
  );
  if (added.length > 0)
    await db.insert(socials).values(
      added.map((platform) => ({
        id: crypto.randomUUID(),
        user_id: user.id,
        platform,
      })),
    );
  updateTag(USERS_TAG);
  updateTag(profileTag(user.id));

  if (!draft.handle || draft.handle === row.username)
    return { username: row.username, stale: false, refused: null };
  try {
    return {
      username: await renameTo(user, draft.handle),
      stale: false,
      refused: null,
    };
  } catch (error) {
    return {
      username: row.username,
      stale: false,
      refused: renameError(error).message,
    };
  }
}

// ── socials ─────────────────────────────────────────────────────────────────

/** A new social starts private and empty: the public page does not change, the
 *  edit page is refreshed to show it. */
export async function addSocial(platform: SocialPlatform) {
  const user = await requireUser();
  await db
    .insert(socials)
    .values({ id: crypto.randomUUID(), user_id: user.id, platform });
  refresh();
}

export async function removeSocial(socialId: SelectSocial["id"]) {
  const user = await requireUser();
  await db
    .delete(socials)
    .where(and(eq(socials.id, socialId), eq(socials.user_id, user.id)));
  updateTag(profileTag(user.id));
}

export async function orderSocial(
  socialId: SelectSocial["id"],
  order: SelectSocial["order"],
) {
  const user = await requireUser();
  await db
    .update(socials)
    .set({ order })
    .where(and(eq(socials.id, socialId), eq(socials.user_id, user.id)));
  updateTag(profileTag(user.id));
}
