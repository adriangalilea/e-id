import { Avatar } from "./ui/avatar";

/** A person's face as e-id draws it everywhere: their GitHub avatar through
 *  @ag/avatar, or with none the handle's first two letters in a circle of the
 *  same size (40 px, the avatar's `md`). */
export default function CustomAvatar({
  username,
  image,
}: {
  username: string;
  image: string;
}) {
  if (image) return <Avatar src={image} alt={`${username} avatar`} size="md" />;
  return (
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 font-mono text-xs text-foreground/70"
    >
      {username.trim().slice(0, 2).toUpperCase() || "ID"}
    </span>
  );
}
