import { LIGHT_HOOKS } from "@/lib/card-image";
import { MARK_BOX, MARK_PATH } from "@/lib/mark";

// THE EMBED: `<e-id-card handle="…">` on any page, one script, no framework.
//
//   <script type="module" src="https://e-id.to/embed.js"></script>
//   <e-id-card handle="adriangalilea"><a href="https://e-id.to/adriangalilea">…</a></e-id-card>
//
// The card is the one the share image draws (lib/card-image, `card.svg`), set in a
// shadow root so the host page's styles never reach it, and lit by the hand as the
// site's card is: it leans a few degrees toward the pointer and the hologram's band
// follows it (`LIGHT_HOOKS` names what moves), brighter while the hand is on it.
// What is inside the element stays shown until the card arrives, and if it never
// does. The origin is the script's own, so a copy served elsewhere draws from there.

const SCRIPT = `const ORIGIN = new URL(import.meta.url).origin;
const HOOKS = ${JSON.stringify(LIGHT_HOOKS)};

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
    ";font-display:swap;src:url(" + ORIGIN + "/api/fonts/" + file + ") format('truetype')}").join("");
  document.head.append(style);
}

const STYLE = \`:host{display:block;width:var(--e-id-card-width,28rem);max-width:100%;perspective:2000px}
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
  static observedAttributes = ["handle"];
  #root = this.attachShadow({ mode: "open" });
  #frame = 0;

  connectedCallback() {
    if (!this.#root.firstChild) this.#root.innerHTML = FALLBACK;
    this.addEventListener("pointermove", this.#move);
    this.addEventListener("pointerleave", this.#leave);
  }

  disconnectedCallback() {
    this.removeEventListener("pointermove", this.#move);
    this.removeEventListener("pointerleave", this.#leave);
    cancelAnimationFrame(this.#frame);
  }

  attributeChangedCallback() {
    this.#load();
  }

  async #load() {
    const handle = this.getAttribute("handle");
    if (!handle) throw new Error("<e-id-card> needs a handle: <e-id-card handle=\\"you\\">");
    const response = await fetch(ORIGIN + "/" + encodeURIComponent(handle) + "/card.svg");
    if (!response.ok) {
      console.error("<e-id-card>: " + handle + " answered " + response.status);
      return;
    }
    const svg = await response.text();
    if (this.getAttribute("handle") !== handle) return;
    this.#root.innerHTML = "<style>" + STYLE + "</style><div class=\\"card\\" part=\\"card\\">" + svg + "</div>";
  }

  // The hand, as a share of the card: where the light lies and where it leans.
  #move = (event) => {
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
`;

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
