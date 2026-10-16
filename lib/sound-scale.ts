// How a sound is analysed for drawing, one spelling for the analysers that read it
// (ui/sound-source) and the drawings that assume their scale (lib/ribbon-lines).
//
// 2048 samples is a 43 ms window at 48 kHz with bins 23 Hz apart, fine enough for the
// low end of a log scale. Web Audio's own smoothing is kept light (τ ≈ 18 ms at 60
// frames a second): a drawing follows with its own attack and release. The decibel
// scale runs to -10 dBFS because Web Audio's default top, -30, clips a mastered
// track's bass.
export const SOUND_SCALE = {
  fftSize: 2048,
  smoothing: 0.4,
  decibels: { min: -100, max: -10 },
} as const
