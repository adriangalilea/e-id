import { LIGHT_HOOKS } from "@/lib/card-image"
import { MARK_BOX, MARK_PATH } from "@/lib/mark"

// THE EMBED: `<e-id-card handle="…">` on any page, one script, no framework.
//
//   <script type="module" src="https://e-id.to/embed.js"></script>
//   <e-id-card handle="adriangalilea"><a href="https://e-id.to/adriangalilea">…</a></e-id-card>
//
// The card is the one the share image draws (lib/card-image, `card.svg`), set in a
// shadow root so the host page's styles never reach it, and lit by the hand as the
// site's card is: it leans a few degrees toward the pointer and the hologram's band
// follows it (`LIGHT_HOOKS` names what moves), brighter while the hand is on it.
// `compact` is the same card as a byline (lib/card-image `compactSvg`, served as
// `byline.svg`), for the
// foot of a post, lit and leaning the same way; it is sized by its height
// (`--e-id-card-height`), the full card by its width (`--e-id-card-width`).
// What is inside the element stays shown until the card arrives, and if it never
// does. The origin is the script's own, so a copy served elsewhere draws from there.
// A link's mark, under the hand or the keys, shows who they are there (the card's
// data, the link's `profile`) in one row beside it.

const SCRIPT = `const ORIGIN = new URL(import.meta.url).origin;
const HOOKS = ${JSON.stringify(LIGHT_HOOKS)};
// A count as people say it: 52, 1.4K, 9.3M.
const COUNT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

const FACES = [
  ["Space Grotesk", 400, "SpaceGrotesk-Regular.ttf"],
  ["Space Grotesk", 500, "SpaceGrotesk-Medium.ttf"],
  ["Space Mono", 400, "SpaceMono-Regular.ttf"],
];
// Fonts declared in a shadow root are not used, so the faces go to the document,
// once.
if (!document.querySelector("style[data-e-id-fonts]")) {
  const style = document.createElement("style");
  style.dataset.eIdFonts = "";
  style.textContent = FACES.map(([family, weight, file]) =>
    "@font-face{font-family:'" + family + "';font-weight:" + weight +
    ";font-display:swap;src:url(" + ORIGIN + "/fonts/" + file + ") format('truetype')}").join("");
  document.head.append(style);
}

const STYLE = \`:host{display:block;position:relative;width:var(--e-id-card-width,28rem);max-width:100%;perspective:2000px}
:host([compact]){display:inline-block;width:auto;vertical-align:middle;perspective:900px}
:host([compact]) svg{width:auto;max-width:100%;height:var(--e-id-card-height,4.5rem)}
.lift{position:absolute;z-index:10;left:0;bottom:100%;width:min(26rem,90vw);padding-bottom:.75rem;opacity:0;visibility:hidden;transform:translateY(.35rem);transition:opacity 180ms ease-out 120ms,transform 180ms ease-out 120ms,visibility 0s linear 300ms}
:host([data-below]) .lift{bottom:auto;top:100%;padding-bottom:0;padding-top:.75rem;transform:translateY(-.35rem)}
:host(:hover) .lift,:host(:focus-within) .lift{opacity:1;visibility:visible;transform:none;transition-delay:0s}
@media (prefers-reduced-motion:reduce){.lift{transition:none}}
.peek{position:absolute;z-index:1;display:flex;align-items:center;gap:.7rem;max-width:min(20rem,100%);padding:.6rem .9rem .6rem .6rem;border-radius:1rem;background:rgb(22 22 24/.82);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:inset 0 0 0 1px rgb(255 255 255/.1),0 .8rem 2rem -.6rem rgb(0 0 0/.6);color:#fff;font:400 .8125rem/1.3 'Space Grotesk',system-ui,sans-serif;pointer-events:none;opacity:0;transform:translate(-50%,-.25rem);transition:opacity 160ms ease-out,transform 160ms ease-out}
.peek[data-open]{opacity:1;transform:translate(-50%,0)}
.peek img{width:2.25rem;height:2.25rem;flex:none;border-radius:999px;object-fit:cover;background:rgb(255 255 255/.08)}
.peek b{display:block;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.peek span{display:block;color:rgb(255 255 255/.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (prefers-reduced-motion:reduce){.peek{transition:none}}
.card{transform:rotateY(calc((var(--px,.5) - .5) * 6deg)) rotateX(calc((var(--py,.35) - .35) * -4deg));transition:transform 700ms cubic-bezier(.22,1,.36,1);filter:drop-shadow(0 1.2rem 1.6rem rgb(0 0 0/.55))}
:host([data-hover]) .card{transition-duration:240ms}
svg{display:block;width:100%;height:auto}
#\${HOOKS.holo}{transition:opacity 500ms cubic-bezier(.22,1,.36,1)}
:host([data-hover]) #\${HOOKS.holo}{opacity:.26}
a{cursor:pointer}a:focus-visible{outline:none}a:focus-visible rect{fill-opacity:.12}
@media (prefers-reduced-motion:reduce){.card{transform:none}}\`;

// Until the card arrives, and if it never does, what the host wrote inside the
// element, worn as e-id's: a quiet pill in the text's own colour with the mark, so
// it reads on any ground and never as the browser's bare blue link.
const FALLBACK = \`<style>:host{display:block}
.fallback{display:inline-flex;align-items:center;gap:.45em;padding:.4em .9em;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 22%,transparent);background:color-mix(in srgb,currentColor 5%,transparent);font:500 .875rem/1.2 'Space Grotesk',system-ui,sans-serif;letter-spacing:-.01em}
.fallback svg{height:1cap;width:auto;fill:currentColor;opacity:.75}
::slotted(a){color:inherit;text-decoration:none}</style><span class="fallback"><svg viewBox="${MARK_BOX.x} ${MARK_BOX.y} ${MARK_BOX.w} ${MARK_BOX.h}" aria-hidden="true"><path d="${MARK_PATH}"/></svg><slot></slot></span>\`;

class EIdCard extends HTMLElement {
  static observedAttributes = ["handle", "compact"];
  #root = this.attachShadow({ mode: "open" });
  #frame = 0;

  connectedCallback() {
    if (!this.#root.firstChild) this.#root.innerHTML = FALLBACK;
    this.addEventListener("pointermove", this.#move);
    this.addEventListener("pointerleave", this.#leave);
    this.addEventListener("pointerenter", this.#rise);
    this.addEventListener("focusin", this.#rise);
  }

  disconnectedCallback() {
    this.removeEventListener("pointermove", this.#move);
    this.removeEventListener("pointerleave", this.#leave);
    this.removeEventListener("pointerenter", this.#rise);
    this.removeEventListener("focusin", this.#rise);
    cancelAnimationFrame(this.#frame);
  }

  // THE CARD RISING FROM ITS BYLINE: under the hand or the keys, the compact
  // face shows the whole card over it (CSS shows it while the hand is on
  // either), the real one, lit and its links answering; below it where the
  // window has no room above. Made on the first rise, so a byline nobody
  // reaches for fetches only itself.
  #rise = () => {
    const lift = this.#root.getElementById("lift");
    if (!lift) return;
    if (!lift.firstChild) {
      const card = document.createElement("e-id-card");
      card.setAttribute("handle", this.getAttribute("handle"));
      card.style.setProperty("--e-id-card-width", "100%");
      lift.append(card);
    }
    const room = this.getBoundingClientRect().top;
    this.toggleAttribute("data-below", room < lift.offsetHeight + 16);
  };

  attributeChangedCallback() {
    this.#load();
  }

  async #load() {
    const handle = this.getAttribute("handle");
    if (!handle) throw new Error("<e-id-card> needs a handle: <e-id-card handle=\\"you\\">");
    // The compact face is the same card drawn as a byline (byline.svg), lit and
    // leaning as the card does. Both prerendered per person, kept until they change.
    const compact = this.hasAttribute("compact");
    const response = await fetch(ORIGIN + "/" + encodeURIComponent(handle) + (compact ? "/byline.svg" : "/card.svg"));
    if (!response.ok) {
      console.error("<e-id-card>: " + handle + " answered " + response.status);
      return;
    }
    const svg = await response.text();
    // Asked again meanwhile, for another card or the other face.
    if (this.getAttribute("handle") !== handle || this.hasAttribute("compact") !== compact) return;
    this.#root.innerHTML = "<style>" + STYLE + "</style><div class=\\"card\\" part=\\"card\\">" + svg + "</div>" +
      (compact
        ? "<div class=\\"lift\\" part=\\"full\\" id=\\"lift\\"></div>"
        : "<div class=\\"peek\\" part=\\"profile\\" role=\\"tooltip\\" id=\\"peek\\"></div>");
    this.#links = null;
    this.#root.addEventListener("pointerover", this.#over);
    this.#root.addEventListener("focusin", this.#over);
    this.#root.addEventListener("pointerout", this.#out);
    this.#root.addEventListener("focusout", this.#out);
  }

  // WHO THEY ARE THERE, on a link's mark: under the hand or the keys, the link's
  // profile (the card's data, links[i].profile, i the mark's data-link) in one
  // row beside it, the site's compact profile drawn without the site. Read once,
  // on the first mark reached.
  #links = null;
  #shown = null;

  #read() {
    if (!this.#links)
      this.#links = fetch(ORIGIN + "/" + encodeURIComponent(this.getAttribute("handle")) + "/json")
        .then((r) => (r.ok ? r.json() : { links: [] }))
        .then((card) => card.links)
        .catch(() => []);
    return this.#links;
  }

  #over = async (event) => {
    const mark = event.target.closest && event.target.closest("a[data-link]");
    if (!mark || mark === this.#shown) return;
    this.#shown = mark;
    const link = (await this.#read())[Number(mark.dataset.link)];
    const peek = this.#root.getElementById("peek");
    if (!peek || this.#shown !== mark) return;
    // A link never read (a site that refuses to be, X) is still its handle,
    // named by it as a profile with no name set is; one with no handle shows
    // nothing.
    const p = link && (link.profile || (link.handle && { name: link.handle, handle: link.handle }));
    if (!p) return this.#hide();
    const face = document.createElement("img");
    face.alt = "";
    if (p.photo) face.src = p.photo;
    const name = document.createElement("b");
    name.textContent = p.name;
    const line = document.createElement("span");
    line.textContent = "@" + p.handle + (p.count ? " · " + COUNT.format(p.count.value) + " " + p.count.unit : "");
    const words = document.createElement("div");
    words.append(name, line);
    peek.replaceChildren(face, words);
    mark.setAttribute("aria-describedby", "peek");
    // Under the mark, centred on it, kept inside the card's width.
    const host = this.getBoundingClientRect();
    const box = mark.getBoundingClientRect();
    const half = Math.min(peek.offsetWidth / 2, host.width / 2);
    const x = Math.min(host.width - half, Math.max(half, box.left - host.left + box.width / 2));
    peek.style.left = x + "px";
    peek.style.top = box.bottom - host.top + 8 + "px";
    peek.toggleAttribute("data-open", true);
  };

  #out = (event) => {
    const to = event.relatedTarget;
    if (to && to.closest && to.closest("a[data-link]") === this.#shown) return;
    this.#hide();
  };

  #hide() {
    this.#shown = null;
    const peek = this.#root.getElementById("peek");
    if (peek) peek.removeAttribute("data-open");
  }

  // The hand, as a share of the card: where the light lies and where it leans.
  #move = (event) => {
    // The hand on the card risen over the byline lights that card, not this one.
    const lift = this.#root.getElementById("lift");
    if (lift && event.composedPath().includes(lift)) return this.#leave();
    const box = this.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const py = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => {
      this.toggleAttribute("data-hover", true);
      this.style.setProperty("--px", String(px));
      this.style.setProperty("--py", String(py));
      this.#light(px);
    });
  };

  #leave = () => {
    cancelAnimationFrame(this.#frame);
    this.removeAttribute("data-hover");
    this.style.removeProperty("--px");
    this.style.removeProperty("--py");
    this.#light(HOOKS.light);
  };

  // The band at the light, its four stops at it -40%, -8%, +8%, +40% of the
  // gradient's line, and the foil moved across with it.
  #light(at) {
    const band = this.#root.getElementById(HOOKS.band);
    const foil = this.#root.getElementById(HOOKS.foil);
    if (!band || !foil) return;
    const stops = band.querySelectorAll("stop");
    [-0.4, -0.08, 0.08, 0.4].forEach((d, i) =>
      stops[i].setAttribute("offset", String(Math.min(1, Math.max(0, at + d)))));
    foil.setAttribute("gradientTransform", "translate(" + (-(at - HOOKS.light) * HOOKS.foilTravel) + " 0)");
  }
}

if (!customElements.get("e-id-card")) customElements.define("e-id-card", EIdCard);
`

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "access-control-allow-origin": "*",
      // Kept an hour where it is served for real; never in development, where
      // a script kept from before an edit drew the old card in its place.
      "cache-control":
        process.env.NODE_ENV === "production"
          ? "public, max-age=3600, stale-while-revalidate=86400"
          : "no-store",
    },
  })
}
