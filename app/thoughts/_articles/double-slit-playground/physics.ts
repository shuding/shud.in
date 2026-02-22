// Physics for double-slit experiment simulation
// Multi-slit interference with optional phase offset, and single-slit diffraction

const WAVELENGTH = 0.4
const SCREEN_DISTANCE = 10
const SCREEN_MIN = -5
const SCREEN_MAX = 5
const NUM_SAMPLES = 1000
// Envelope sigma: intensity ~ exp(-y²/(2σ²)) so center is brighter, tails extend past ±5
const INTERFERENCE_ENVELOPE_SIGMA = 6

// Wavenumber k = 2π/λ
const K = (2 * Math.PI) / WAVELENGTH
const SCREEN_DISTANCE_SQ = SCREEN_DISTANCE * SCREEN_DISTANCE
const INTERFERENCE_ENVELOPE_DENOM =
  2 * INTERFERENCE_ENVELOPE_SIGMA * INTERFERENCE_ENVELOPE_SIGMA

// Precomputed screen positions
const screenPositions: number[] = []
for (let i = 0; i < NUM_SAMPLES; i++) {
  screenPositions.push(
    SCREEN_MIN + (i / (NUM_SAMPLES - 1)) * (SCREEN_MAX - SCREEN_MIN),
  )
}

// Multi-slit interference pattern
// Given N slit positions, compute interference pattern on screen
// offset: phase offset applied to all slits except the first (default 0)
function computeInterferenceIntensity(
  slitPositions: number[],
  offset: number = 0,
): number[] {
  const intensities: number[] = []
  const nSlits = slitPositions.length

  for (let s = 0; s < NUM_SAMPLES; s++) {
    const y = screenPositions[s]
    let re = 0
    let im = 0
    for (let i = 0; i < nSlits; i++) {
      const slitY = slitPositions[i]
      const dx = y - slitY
      const r = Math.sqrt(SCREEN_DISTANCE_SQ + dx * dx)
      const phase = K * r + (i > 0 ? offset : 0)
      const envelope = 1 / Math.sqrt(r)
      re += Math.cos(phase) * envelope
      im += Math.sin(phase) * envelope
    }
    const envelope = Math.exp(-(y * y) / INTERFERENCE_ENVELOPE_DENOM)
    intensities.push((re * re + im * im) * envelope)
  }

  return intensities
}

// Single-slit diffraction - Gaussian approximation for clearer visualization
// Centered on the slit position with narrow width for distinct blobs
function computeDiffractionIntensity(slitPosition: number): number[] {
  const intensities: number[] = []
  const sigma = 0.5
  const twoSigmaSq = 2 * sigma * sigma

  for (let s = 0; s < NUM_SAMPLES; s++) {
    const delta = screenPositions[s] - slitPosition
    intensities.push(Math.exp(-(delta * delta) / twoSigmaSq))
  }

  return intensities
}

// Convert intensity array to cumulative distribution function
function intensityToCDF(intensities: number[]): number[] {
  let total = 0
  for (let i = 0; i < intensities.length; i++) total += intensities[i]
  const cdf: number[] = []
  let cumulative = 0
  for (let i = 0; i < intensities.length; i++) {
    cumulative += intensities[i] / total
    cdf.push(cumulative)
  }
  cdf[cdf.length - 1] = 1
  return cdf
}

// Sample from distribution using inverse CDF
function sampleFromCDF(cdf: number[], random: number): number {
  // Binary search for the position
  let lo = 0
  let hi = cdf.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (cdf[mid] < random) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  return screenPositions[lo]
}

// Mulberry32 PRNG for deterministic sampling
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Sample a screen position from interference pattern
export function sampleInterference(
  slitPositions: number[],
  seed: number,
  offset: number = 0,
): number {
  const intensities = computeInterferenceIntensity(slitPositions, offset)
  const cdf = intensityToCDF(intensities)
  const random = mulberry32(seed)()
  return sampleFromCDF(cdf, random)
}

// Sample a screen position from diffraction pattern (collapse)
export function sampleDiffraction(slitPosition: number, seed: number): number {
  const intensities = computeDiffractionIntensity(slitPosition)
  const cdf = intensityToCDF(intensities)
  const random = mulberry32(seed)()
  return sampleFromCDF(cdf, random)
}

// Compute phase offset from a log string (for quantum eraser effect)
// Different strings map to different offsets; strings that differ give complementary fringes
export function computePhaseOffset(logValue: string): number {
  if (!logValue) return 0
  // Simple hash: sum of char codes
  let hash = 0
  for (let i = 0; i < logValue.length; i++) {
    hash = (hash << 5) - hash + logValue.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  // Map to 0 or π based on hash parity
  return hash & 1 ? Math.PI : 0
}

// Get the intensity distribution for visualization
export function getInterferencePattern(
  slitPositions: number[],
): { x: number; intensity: number }[] {
  const intensities = computeInterferenceIntensity(slitPositions)
  let maxIntensity = 0
  for (let i = 0; i < intensities.length; i++) {
    const v = intensities[i]
    if (v > maxIntensity) maxIntensity = v
  }
  return screenPositions.map((x, i) => ({
    x,
    intensity: intensities[i] / maxIntensity,
  }))
}

// Screen range for canvas mapping
export const SCREEN_RANGE = { min: SCREEN_MIN, max: SCREEN_MAX }
