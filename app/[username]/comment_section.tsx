import {
  fetchCommentsConditionally,
  getTestimonials,
  getUserByUsernameNormalizedCached,
} from "@/db/actions";
import Comment from "@/components/comment";
import { auth } from "@/auth";
import { Testimonial } from "@/components/quote";
import { notFound } from "next/navigation";
import CommentForm from "./comment_form";
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
  let comments = null;

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

      {visitorUserId && visitorUserId !== profileUserId && (
        <CommentForm profileUserId={profileUserId} />
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
