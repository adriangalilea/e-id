import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import HumanTime from "./human_date";

interface CommentProps {
  profilePicture: string;
  username: string;
  timestamp: string;
  content: string;
}

export default function Comment(props: CommentProps) {
  const { profilePicture, username, timestamp, content } = props;

  return (
    <div className="flex items-center gap-2">
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" />
        <AvatarFallback>{username}</AvatarFallback>
      </Avatar>
      <article className="flex items-start flex-col prose dark:prose-invert antialiased prose-zinc">
        <header className="flex items-center gap-2">
          <h4 className="flex items-center !mt-0 !mb-0">{username}</h4>
          <HumanTime date={timestamp} />
        </header>
        <p className="flex !mt-0">{content}</p>
      </article>
    </div>
  );
}
