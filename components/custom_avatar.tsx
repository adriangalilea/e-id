import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export default function CustomAvatar({
  username,
  image,
}: {
  username: string;
  image: string;
}) {
  return (
    <Avatar className="!size-10 ">
      <AvatarImage
        src={image || ""}
        alt={username + " avatar"}
        className="!m-0"
      />
      <AvatarFallback>
        {username ? username.trim().slice(0, 2).toUpperCase() : "ID"}
      </AvatarFallback>
    </Avatar>
  );
}
