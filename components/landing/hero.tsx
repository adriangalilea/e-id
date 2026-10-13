import { EMOJI_DOMAIN } from "@/lib/const";
import { MakeYours } from "./make-yours";

export function Hero() {
  return (
    <section className="prose prose-zinc dark:prose-invert flex flex-col gap-3 pt-6">
      <h1 className="m-0! text-3xl font-light">
        your page at {EMOJI_DOMAIN}/you
      </h1>
      <p className="m-0! font-light">one link for every place you are online.</p>
      <p className="m-0! text-sm font-light opacity-70">
        made for developers: sign in with github and your page fills itself
        with your name, avatar, links and contribution graph.
      </p>
      <div>
        <MakeYours />
      </div>
    </section>
  );
}
