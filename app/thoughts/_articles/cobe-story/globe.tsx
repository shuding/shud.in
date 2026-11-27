'use client'

import { useEffect, useRef } from 'react'

import { NEAREST_FIBONACCI } from '../../_demos/fibonacci'
import { LAND_MAP } from '../../_demos/land-map'

// One shader for every stage of the story. Each stage is a set of targets for
// a few uniforms, and the globe eases between them, so stages morph into each
// other instead of cutting.

export type Look = {
  // The world map as a smooth fill.
  land: number
  // The dot lattice.
  dots: number
  // Keep only the dots on land.
  mask: number
  // 0 for a latitude/longitude lattice, 1 for Spherical Fibonacci.
  fib: number
  // Shading and glow.
  light: number
  // COBE v2 markers.
  markers: number
  // Tilt of the north pole towards the viewer.
  theta: number
}

const VERTEX = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`

const FRAGMENT = `
precision highp float;

uniform vec2 uRes;
uniform float uPhi;
uniform float uTheta;
uniform sampler2D uMapSharp;
uniform sampler2D uMapSoft;
uniform float uMapRes;
uniform float uN;
uniform float uLand;
uniform float uDots;
uniform float uMask;
uniform float uFib;
uniform float uLight;
uniform float uMarkers;
uniform vec3 uCity[4];

const float PI = 3.14159265359;
const float PHI = 1.61803398875;
const float SCALE = 0.8;

${NEAREST_FIBONACCI}

// Rows and columns at the same angular spacing: even at the equator,
// crowded at the poles.
vec3 nearestLatLong(vec3 p, float d) {
  float lat = asin(clamp(p.z, -1.0, 1.0));
  float lon = atan(p.y, p.x);
  float glat = clamp(floor(lat / d + 0.5) * d, -PI / 2.0, PI / 2.0);
  float glon = floor(lon / d + 0.5) * d;
  return vec3(cos(glat) * cos(glon), cos(glat) * sin(glon), sin(glat));
}

vec2 toMap(vec3 q) {
  float lat = asin(clamp(q.z, -1.0, 1.0));
  float lon = atan(q.y, q.x);
  return vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
}

// Is the dot centered at \`q\` on land, in a map shrunk to \`uMapRes\` wide?
float landAt(vec3 q) {
  vec2 size = vec2(uMapRes, uMapRes * 0.5);
  vec2 uv = (floor(toMap(q) * size) + 0.5) / size;
  return step(0.5, texture2D(uMapSharp, uv).r);
}

void main() {
  float side = min(uRes.x, uRes.y);
  float px = 2.0 / side / SCALE;
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / side / SCALE;
  float r = length(uv);

  vec3 halo = vec3(0.412, 0.451, 0.506);
  if (r > 1.0) {
    float glow = uLight * 0.14 * exp(-(r - 1.0) * 9.0);
    gl_FragColor = vec4(halo * glow, glow);
    return;
  }

  // View space: x right, y up, z towards the viewer. Tilt, then spin.
  vec3 n = vec3(uv, sqrt(1.0 - r * r));
  float ct = cos(uTheta), st = sin(uTheta);
  vec3 t = vec3(n.x, ct * n.y - st * n.z, st * n.y + ct * n.z);
  float cp = cos(uPhi), sp = sin(uPhi);
  vec3 w = vec3(cp * t.x + sp * t.z, t.y, -sp * t.x + cp * t.z);
  // Lattice space: z is the pole, longitude 0 faces the viewer.
  vec3 s = vec3(w.z, w.x, w.y);

  float spacing = sqrt(4.0 * PI / uN);
  float radius = spacing * 0.28;

  vec3 qa = nearestLatLong(s, spacing);
  vec3 qb = nearestFibonacci(s, uN);
  float da = smoothstep(radius + px, radius - px, distance(s, qa));
  float db = smoothstep(radius + px, radius - px, distance(s, qb));
  float dotA = da * mix(1.0, landAt(qa), uMask);
  float dotB = db * mix(1.0, landAt(qb), uMask);
  float dots = mix(dotA, dotB, uFib) * uDots;

  float fill = smoothstep(0.3, 0.7, texture2D(uMapSoft, toMap(s)).r) * uLand;

  vec3 paper = vec3(0.988);
  vec3 ink = vec3(0.290, 0.318, 0.357);
  vec3 color = mix(paper, vec3(0.922, 0.929, 0.937), pow(r, 3.0) * mix(0.35, 0.9, uLight));
  float facing = mix(1.0, mix(0.3, 1.0, n.z), uLight);
  color = mix(color, ink, fill * 0.85);
  color = mix(color, ink, dots * facing);

  float marker = 0.0;
  float markerRadius = 0.032 * uMarkers;
  for (int i = 0; i < 4; i++) {
    marker = max(marker, smoothstep(markerRadius + px, markerRadius - px, distance(s, uCity[i])));
  }
  color = mix(color, vec3(0.0, 0.282, 0.941), marker * step(0.01, uMarkers));

  // A hairline edge until the light takes over.
  float edge = smoothstep(1.0 - 2.0 * px, 1.0, r) * (1.0 - uLight);
  color = mix(color, vec3(0.80, 0.82, 0.84), edge);

  float alpha = smoothstep(1.0, 1.0 - px, r);
  gl_FragColor = vec4(color * alpha, alpha);
}
`

function toLattice(lat: number, lon: number) {
  const a = (lat * Math.PI) / 180
  const b = (lon * Math.PI) / 180
  return [Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a)]
}

const CITIES = [
  toLattice(37.77, -122.42), // San Francisco
  toLattice(51.51, -0.13), // London
  toLattice(35.68, 139.69), // Tokyo
  toLattice(-23.55, -46.63), // São Paulo
].flat()

const KEYS = ['land', 'dots', 'mask', 'fib', 'light', 'markers', 'theta'] as const

export function StoryGlobe({
  look,
  mapRes,
  dotCount,
  className,
}: {
  look: Look
  mapRes: number
  dotCount: number
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputs = useRef({ look, mapRes, dotCount })
  inputs.current = { look, mapRes, dotCount }
  const startRef = useRef(() => {})

  // Redraw when the stage or a control changes (the loop may be idle).
  useEffect(() => startRef.current(), [look, mapRes, dotCount])

  useEffect(() => {
    const canvas = canvasRef.current!
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true })
    if (!gl) return

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return shader
    }
    const shaders = [
      compile(gl.VERTEX_SHADER, VERTEX),
      compile(gl.FRAGMENT_SHADER, FRAGMENT),
    ]
    const program = gl.createProgram()!
    for (const shader of shaders) gl.attachShader(program, shader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Globe: ' + gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    const u = (name: string) => gl.getUniformLocation(program, name)
    const uniforms = {
      res: u('uRes'),
      phi: u('uPhi'),
      theta: u('uTheta'),
      mapRes: u('uMapRes'),
      n: u('uN'),
      land: u('uLand'),
      dots: u('uDots'),
      mask: u('uMask'),
      fib: u('uFib'),
      light: u('uLight'),
      markers: u('uMarkers'),
    }
    gl.uniform3fv(u('uCity'), CITIES)

    // The same map twice: sampled sharp for the dots, smooth for the fill.
    const textures = [gl.NEAREST, gl.LINEAR].map((filter, unit) => {
      const texture = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      return texture
    })
    gl.uniform1i(u('uMapSharp'), 0)
    gl.uniform1i(u('uMapSoft'), 1)

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
    const current = { ...inputs.current.look }
    let phi = 1.9
    let spin = 0
    let thetaOffset = 0
    let dragging = false
    let lastX = 0
    let lastY = 0
    let last = 0
    let frame = 0
    let ready = false
    let onScreen = true
    let disposed = false

    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2)
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uniforms.res, canvas.width, canvas.height)
    }

    const tick = (now: number) => {
      frame = 0
      if (disposed || !ready) return
      const dt = last ? Math.min(now - last, 50) : 16
      last = now
      const still = reducedMotion.matches
      const { look, mapRes, dotCount } = inputs.current

      // Ease every uniform towards its target.
      const k = still ? 1 : 1 - Math.exp(-dt / 220)
      for (const key of KEYS) current[key] += (look[key] - current[key]) * k

      if (!dragging) {
        // Drift back to the stage's tilt, and coast after a fling.
        thetaOffset *= Math.exp(-dt / 900)
        spin *= Math.exp(-dt / 600)
        if (!still) phi -= dt * 0.00012
        phi += spin * dt
      }

      gl.uniform1f(uniforms.phi, phi)
      gl.uniform1f(uniforms.theta, current.theta + thetaOffset)
      gl.uniform1f(uniforms.mapRes, mapRes)
      gl.uniform1f(uniforms.n, dotCount)
      gl.uniform1f(uniforms.land, current.land)
      gl.uniform1f(uniforms.dots, current.dots)
      gl.uniform1f(uniforms.mask, current.mask)
      gl.uniform1f(uniforms.fib, current.fib)
      gl.uniform1f(uniforms.light, current.light)
      gl.uniform1f(uniforms.markers, current.markers)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      // With reduced motion, nothing moves on its own: draw once and idle
      // until something changes.
      if (onScreen && (!still || dragging)) frame = requestAnimationFrame(tick)
      else last = 0
    }
    const start = () => {
      if (!frame && ready && onScreen) frame = requestAnimationFrame(tick)
    }
    startRef.current = start

    // Drag to spin. Vertical drags tilt with a mouse; on touch screens they
    // scroll the page (`touch-action: pan-y`).
    const onDown = (event: PointerEvent) => {
      dragging = true
      spin = 0
      lastX = event.clientX
      lastY = event.clientY
      canvas.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      if (!dragging) return
      const size = canvas.clientHeight * 0.8
      const dx = ((event.clientX - lastX) / size) * 2
      const dy = ((event.clientY - lastY) / size) * 2
      lastX = event.clientX
      lastY = event.clientY
      phi -= dx
      spin = -dx / 16
      if (event.pointerType === 'mouse') {
        thetaOffset = Math.max(-1, Math.min(1, thetaOffset + dy))
      }
      start()
    }
    const onUp = () => {
      dragging = false
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)

    const resizeObserver = new ResizeObserver(() => {
      resize()
      start()
    })
    resizeObserver.observe(canvas)
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      start()
    })
    visibility.observe(canvas)
    resize()

    const image = new Image()
    image.onload = () => {
      if (disposed) return
      for (const [unit, texture] of textures.entries()) {
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, image)
      }
      ready = true
      start()
    }
    image.src = LAND_MAP

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      visibility.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      for (const shader of shaders) gl.deleteShader(shader)
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
      for (const texture of textures) gl.deleteTexture(texture)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ touchAction: 'pan-y' }}
      role='img'
      aria-label='A dotted globe that rebuilds itself as you read. Drag to spin it.'
    />
  )
}
