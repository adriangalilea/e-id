// WHAT IS AUDIBLE: one voice on a page at a time. A thing that starts to sound claims
// the floor under its key; the voice that held it is silenced (each of its claimers
// told, in the order they claimed: a video pauses, a gallery cell ramps down and
// mutes, a reading closes its docked face). Claims under the SAME key are one voice:
// a reading and the video it plays claim together and are silenced together, never
// each other. A claimer releases when it stops wanting the floor (it unmounts, it is
// closed); the floor is free once the voice's last claimer has gone.
//
// One floor per page: whatever sounds, from any item, asks it, so a gallery cell, a
// player and a reading can never be heard at once. Keys are compared by identity: a
// string names a voice several things share, an object (an element) a voice of one.
//
// Framework-free (no React, no DOM); ui/use-audible is the hook over it. Proven by
// scripts/examples/audible.ts.

/** Who a voice is: a shared name, or the one thing speaking (an element). */
export type VoiceKey = string | object

/** What a claimer does when its voice loses the floor. */
export type Silence = () => void

let holder: { key: VoiceKey; claims: Set<Silence> } | null = null
const listeners = new Set<() => void>()

const notify = () => {
  for (const l of listeners) l()
}

/** Claims the floor for `key`. Another voice holding it is silenced first; a claim
 *  under the voice already holding it joins it. Returns the release. */
export function claim(key: VoiceKey, silence: Silence): () => void {
  if (holder && holder.key !== key) {
    const was = holder
    holder = null
    for (const s of was.claims) s()
  }
  if (!holder) holder = { key, claims: new Set() }
  holder.claims.add(silence)
  notify()
  return () => release(key, silence)
}

/** Gives one claim back: the floor is free once the voice has none left. Releasing a
 *  claim that no longer holds the floor (its voice was silenced) does nothing. */
export function release(key: VoiceKey, silence: Silence): void {
  if (!holder || holder.key !== key || !holder.claims.delete(silence)) return
  if (holder.claims.size === 0) holder = null
  notify()
}

/** The voice holding the floor, or null. */
export const holding = (): VoiceKey | null => holder?.key ?? null

/** Hears every change of who holds the floor. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
