import Link from "next/link";
import CustomAvatar from "./custom_avatar";

export default function UserButton({
  username,
  image,
}: {
  username: string;
  image: string | null;
}) {
  return (
    <Link
      href={`/${username}`}
      aria-label={`your page, @${username}`}
      className="block transition-opacity ease-out hover:opacity-80"
    >
      <CustomAvatar username={username} image={image ?? ""} />
    </Link>
  );
}
