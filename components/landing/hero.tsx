import { EmojiDomain } from "@/components/brand";
import { MakeYours } from "./make-yours";

export function Hero() {
  return (
    <section className="flex flex-col gap-8 lg:gap-12">
      <h1 className="text-[clamp(2.75rem,9vw,6rem)] leading-[0.92] font-medium tracking-[-0.045em]">
        <span className="block text-foreground/45">your page at</span>
        <EmojiDomain path="/you" className="block" />
      </h1>
      <div className="flex max-w-md flex-col gap-3">
        <p className="text-xl leading-snug">
          one link for every place you are online.
        </p>
        <p className="text-[15px] leading-relaxed text-foreground/55">
          made for developers: sign in with github and your page fills itself
          with your name, avatar, links and contribution graph.
        </p>
      </div>
      <MakeYours />
    </section>
  );
}
