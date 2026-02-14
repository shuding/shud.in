// Physics for double-slit experiment simulation
// Multi-slit interference and single-slit diffraction

const WAVELENGTH = 0.4
const SCREEN_DISTANCE = 10
const SCREEN_MIN = -5
const SCREEN_MAX = 5
const NUM_SAMPLES = 1000

// Wavenumber k = 2π/λ
const K = (2 * Math.PI) / WAVELENGTH

// Precomputed screen positions
const screenPositions: number[] = []
for (let i = 0; i < NUM_SAMPLES; i++) {
  screenPositions.push(
    SCREEN_MIN + (i / (NUM_SAMPLES - 1)) * (SCREEN_MAX - SCREEN_MIN),
  )
}

// Complex number helpers
interface Complex {
  re: number
  im: number
}

function complexAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im }
}

function complexExp(phase: number): Complex {
  return { re: Math.cos(phase), im: Math.sin(phase) }
}

function complexMagnitudeSquared(c: Complex): number {
  return c.re * c.re + c.im * c.im
}

// Multi-slit interference pattern
// Given N slit positions, compute interference pattern on screen
function computeInterferenceIntensity(slitPositions: number[]): number[] {
  const intensities: number[] = []

  for (const y of screenPositions) {
    // Sum amplitudes from all slits
    let amplitude: Complex = { re: 0, im: 0 }
    for (const slitY of slitPositions) {
      // Distance from slit to screen point
      const r = Math.sqrt(
        SCREEN_DISTANCE * SCREEN_DISTANCE + (y - slitY) * (y - slitY),
      )
      // Phase = k * r
      const phase = K * r
      amplitude = complexAdd(amplitude, complexExp(phase))
    }
    intensities.push(complexMagnitudeSquared(amplitude))
  }

  return intensities
}

// Single-slit diffraction - Gaussian approximation for clearer visualization
// Centered on the slit position with narrow width for distinct blobs
function computeDiffractionIntensity(slitPosition: number): number[] {
  const intensities: number[] = []
  // Narrow width so blobs at different slit positions don't overlap
  const sigma = 0.25

  for (const y of screenPositions) {
    const delta = y - slitPosition
    // Gaussian distribution centered at slit position
    const intensity = Math.exp(-(delta * delta) / (2 * sigma * sigma))
    intensities.push(intensity)
  }

  return intensities
}

// Convert intensity array to cumulative distribution function
function intensityToCDF(intensities: number[]): number[] {
  const total = intensities.reduce((a, b) => a + b, 0)
  const cdf: number[] = []
  let cumulative = 0
  for (const intensity of intensities) {
    cumulative += intensity / total
    cdf.push(cumulative)
  }
  // Ensure last value is exactly 1
  cdf[cdf.length - 1] = 1
  return cdf
}

// Sample from distribution using inverse CDF
function sampleFromCDF(cdf: number[], random: number): number {
  // Binary search for the position
  let lo = 0
  let hi = cdf.length - 1
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
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
): number {
  const intensities = computeInterferenceIntensity(slitPositions)
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

// Get the intensity distribution for visualization
export function getInterferencePattern(
  slitPositions: number[],
): { x: number; intensity: number }[] {
  const intensities = computeInterferenceIntensity(slitPositions)
  const maxIntensity = Math.max(...intensities)
  return screenPositions.map((x, i) => ({
    x,
    intensity: intensities[i] / maxIntensity,
  }))
}

export function getDiffractionPattern(
  slitPosition: number,
): { x: number; intensity: number }[] {
  const intensities = computeDiffractionIntensity(slitPosition)
  const maxIntensity = Math.max(...intensities)
  return screenPositions.map((x, i) => ({
    x,
    intensity: intensities[i] / maxIntensity,
  }))
}

// Screen range for canvas mapping
export const SCREEN_RANGE = { min: SCREEN_MIN, max: SCREEN_MAX }
