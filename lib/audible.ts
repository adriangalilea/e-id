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
