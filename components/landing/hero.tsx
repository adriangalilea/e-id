import { EmojiDomain } from "@/components/brand";
import { GUTTER } from "@/components/frame";
import { IdCard, type Holder } from "@/components/id-card";
import { cn } from "@/lib/utils";
import { MakeYours } from "./make-yours";

/** The card the landing hands its reader: theirs, not made yet. Its words are the
 *  page's own line, what an e-id is. */
const YOU: Holder = {
  name: "you",
  username: "you",
  image: null,
  country: "XX",
  bio: "one link for every place you are online.",
};

/** The landing's first screen: the address and the way in, beside the card it
 *  makes, closed by a hairline the sign-ups start from. */
export function Hero() {
  return (
    <section className="relative isolate border-b border-white/10">
      <div
        className={cn(
          "mx-auto grid w-full max-w-6xl items-center gap-16 pt-20 pb-20 sm:pt-28 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20 lg:py-32",
          GUTTER,
        )}
      >
        <div className="flex flex-col gap-12">
          <h1 className="text-[clamp(3rem,7vw,6rem)] leading-[0.95] font-medium tracking-[-0.045em]">
            <span className="block text-foreground/40">your page at</span>
            <EmojiDomain path="/you" className="block" />
          </h1>
          <MakeYours />
        </div>
        <div className="lg:[perspective:1600px]">
          <IdCard
            holder={YOU}
            heading="p"
            className="mx-auto w-full max-w-sm lg:[transform:rotateY(-16deg)_rotateX(6deg)]"
          />
        </div>
      </div>
    </section>
  );
}
