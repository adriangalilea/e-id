import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer className="w-full prose lg:prose-xl prose-zinc dark:prose-invert fixed bottom-0">
      <Button asChild variant="link">
        <Link className="lg:no-underline" href="/">
          👤 Get your e-id
        </Link>
      </Button>
    </footer>
  );
}
