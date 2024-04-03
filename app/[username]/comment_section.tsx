import {
  fetchCommentsConditionally,
  createCommentFromForm,
  getTestimonials,
  getUserByUsernameNormalizedCached,
} from "@/db/actions";
import Comment from "@/components/comment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizontal } from "lucide-react";
import { auth } from "@/auth";
import { Testimonial } from "@/components/quote";
import { notFound } from "next/navigation";
// import { useState } from "react";

export default async function CommentSection({
  username,
}: {
  username: string;
}) {
  const session = await auth();
  const visitorUserId = session?.user?.id;
  const profileUser = await getUserByUsernameNormalizedCached(username);
  if (!profileUser) {
    return notFound();
  }
  const profileUserId = profileUser.id;

  // TODO: make the form into a client component
  // const [commenntText, setCommentText] = useState("");
  let createCommentFromFormWithID = null;
  let comments = null;
  if (visitorUserId && profileUserId) {
    createCommentFromFormWithID = createCommentFromForm.bind(
      null,
      profileUserId,
    );
  }

  if (visitorUserId) {
    comments = await fetchCommentsConditionally(profileUserId, visitorUserId);
  }

  const testimonials = await getTestimonials(profileUserId);

  return (
    <div className="relative">
      {visitorUserId !== profileUserId && testimonials.length > 0 && (
        <div className="mb-6 sm:mb-12">
          {testimonials.map((testimonial) => (
            <div key={testimonial.commentId}>
              <Testimonial
                text={testimonial.body}
                name={testimonial.user.name!}
                image={testimonial.user.image!}
                date={testimonial.createdAt}
                username={testimonial.user.username!}
              />
            </div>
          ))}
        </div>
      )}

      {createCommentFromFormWithID &&
        visitorUserId &&
        visitorUserId !== profileUserId && (
          <form
            action={createCommentFromFormWithID}
            className="sticky top-0 z-10"
          >
            <div className="flex items-center gap-2">
              <Input
                disabled={!visitorUserId}
                type="text"
                name="body"
                className="bg-zinc-200/60 text-[16px] shadow-md backdrop-blur-md"
                placeholder="I want everyone to know..."
              />
              <Button
                disabled={!visitorUserId}
                type="submit"
                className="z-10 !h-10 !w-10 shrink-0 grow-0 bg-zinc-500/20 !p-0 shadow-md backdrop-blur-md"
                variant="ghost"
              >
                <SendHorizontal strokeWidth="1" />
              </Button>
            </div>
          </form>
        )}

      <div className="my-2 flex flex-col gap-2">
        {comments &&
          comments.map((comment) => (
            <div key={comment.commentId}>
              <Comment
                profilePicture={comment.user.image}
                name={comment.user.name}
                username={comment.user.username}
                date={comment.createdAt}
                body={comment.body}
                commentId={comment.commentId}
                pinned={comment.pinned}
                canPin={visitorUserId === profileUserId}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
