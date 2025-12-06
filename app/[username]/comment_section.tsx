import {
  fetchCommentsConditionally,
  getTestimonialsCached,
  getUserByUsernameNormalizedCached,
} from "@/db/actions";
import Comment from "@/components/comment";
import { auth } from "@/auth";
import { Testimonial } from "@/components/quote";
import CommentForm from "./comment_form";
import { headers } from "next/headers";

async function TestimonialsContent({ userId }: { userId: string }) {
  const testimonials = await getTestimonialsCached(userId);

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <div className="animate-fade-in">
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
  );
}

export async function TestimonialsSection({ userId }: { userId: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.id === userId) {
    return null;
  }

  return <TestimonialsContent userId={userId} />;
}

export async function CommentInteraction({
  profileUserId,
}: {
  profileUserId: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const visitorUserId = session?.user?.id;

  if (!visitorUserId) {
    return null;
  }

  const isOwner = visitorUserId === profileUserId;
  const comments = await fetchCommentsConditionally(
    profileUserId,
    visitorUserId,
  );

  if (isOwner) {
    if (comments.length === 0) {
      return null;
    }

    return (
      <div className="relative animate-fade-in">
        <div className="my-2 flex flex-col gap-2">
          {comments.map((comment) => (
            <div key={comment.commentId}>
              <Comment
                profilePicture={comment.user.image}
                name={comment.user.name}
                username={comment.user.username}
                date={comment.createdAt}
                body={comment.body}
                commentId={comment.commentId}
                pinned={comment.pinned}
                canPin={true}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative animate-fade-in">
      <CommentForm profileUserId={profileUserId} />

      <div className="my-2 flex flex-col gap-2">
        {comments.map((comment) => (
          <div key={comment.commentId}>
            <Comment
              profilePicture={comment.user.image}
              name={comment.user.name}
              username={comment.user.username}
              date={comment.createdAt}
              body={comment.body}
              commentId={comment.commentId}
              pinned={comment.pinned}
              canPin={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function CommentSection({
  username,
}: {
  username: string;
}) {
  const profileUser = await getUserByUsernameNormalizedCached(username);
  if (!profileUser) {
    return null;
  }

  return (
    <>
      <TestimonialsSection userId={profileUser.id} />
      <CommentInteraction profileUserId={profileUser.id} />
    </>
  );
}
