'use client'

import { useEffect, useRef } from 'react'

import { NEAREST_FIBONACCI } from './fibonacci'
import { LAND_MAP } from './land-map'

// A small COBE-style globe: a sphere drawn entirely in a fragment shader, with
// land sampled on a Spherical Fibonacci lattice. One blue marker sits on San
// Francisco, the same blue as the site's favicon.

const VERTEX = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`

const FRAGMENT = `
precision highp float;

uniform vec2 uRes;
uniform float uPhi;
uniform float uTheta;
uniform vec3 uMarker;
uniform float uScale;
uniform sampler2D uMap;

const float PI = 3.14159265359;
const float PHI = 1.61803398875;
const float N = 12000.0;

${NEAREST_FIBONACCI}

float isLand(vec3 q) {
  float lat = asin(q.z);
  float lon = atan(q.y, q.x);
  return step(0.5, texture2D(uMap, vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI)).r);
}

void main() {
  float px = 2.0 / min(uRes.x, uRes.y) / uScale;
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y) / uScale;
  float r = length(uv);
  if (r > 1.0) { gl_FragColor = vec4(0.0); return; }

  // View space: x right, y up, z towards the viewer.
  vec3 n = vec3(uv, sqrt(1.0 - r * r));

  // Tilt the north pole towards the viewer, then spin around it.
  float ct = cos(uTheta), st = sin(uTheta);
  vec3 t = vec3(n.x, ct * n.y - st * n.z, st * n.y + ct * n.z);
  float cp = cos(uPhi), sp = sin(uPhi);
  vec3 w = vec3(cp * t.x + sp * t.z, t.y, -sp * t.x + cp * t.z);

  // Lattice space: z is the pole, longitude 0 faces the viewer, east is +y.
  vec3 s = vec3(w.z, w.x, w.y);
  vec3 q = nearestFibonacci(s, N);

  float dotRadius = 0.0085;
  float dotMask = smoothstep(dotRadius + px, dotRadius - px, distance(s, q));
  float land = isLand(q);

  // Paper-white sphere, slightly shaded towards the limb.
  vec3 paper = vec3(0.988);
  vec3 color = mix(paper, vec3(0.935, 0.942, 0.952), pow(r, 3.0));

  float facing = mix(0.35, 1.0, n.z);
  vec3 ink = vec3(0.290, 0.318, 0.357);
  vec3 faint = vec3(0.847, 0.859, 0.875);
  color = mix(color, faint, dotMask * (1.0 - land) * 0.55 * facing);
  color = mix(color, ink, dotMask * land * facing);

  float markerRadius = 0.034;
  float marker = smoothstep(markerRadius + px, markerRadius - px, distance(s, uMarker));
  color = mix(color, vec3(0.0, 0.282, 0.941), marker);

  float alpha = smoothstep(1.0, 1.0 - px, r);
  gl_FragColor = vec4(color * alpha, alpha);
}
`

function toLattice(lat: number, lon: number): [number, number, number] {
  const a = (lat * Math.PI) / 180
  const b = (lon * Math.PI) / 180
  return [Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a)]
}

const SAN_FRANCISCO = toLattice(37.77, -122.42)

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

export default function Globe({
  paused = false,
  scale = 0.92,
  className,
}: {
  paused?: boolean
  // The globe's diameter, relative to the canvas's shorter side.
  scale?: number
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pausedRef = useRef(paused)
  const resumeRef = useRef<() => void>(() => {})

  useEffect(() => {
    pausedRef.current = paused
    if (!paused) resumeRef.current()
  }, [paused])

  useEffect(() => {
    const canvas = canvasRef.current!
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
    })
    if (!gl) return

    const program = gl.createProgram()!
    const shaders = [
      compile(gl, gl.VERTEX_SHADER, VERTEX),
      compile(gl, gl.FRAGMENT_SHADER, FRAGMENT),
    ]
    for (const shader of shaders) gl.attachShader(program, shader)
    gl.linkProgram(program)
    // A preview must never break the page around it: without a working
    // WebGL, leave the canvas empty.
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Globe: ' + gl.getProgramInfoLog(program))
      for (const shader of shaders) gl.deleteShader(shader)
      gl.deleteProgram(program)
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, 'uRes')
    const uPhi = gl.getUniformLocation(program, 'uPhi')
    const uTheta = gl.getUniformLocation(program, 'uTheta')
    gl.uniform3fv(gl.getUniformLocation(program, 'uMarker'), SAN_FRANCISCO)
    gl.uniform1f(uTheta, 0.32)
    gl.uniform1f(gl.getUniformLocation(program, 'uScale'), scale)

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
    // Start with San Francisco just coming around the left edge.
    const START = 2.6
    let phi = START
    let last = 0
    let frame = 0
    let ready = false
    let disposed = false

    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2)
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uRes, canvas.width, canvas.height)
    }

    const draw = () => {
      gl.uniform1f(uPhi, phi)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const tick = (now: number) => {
      frame = 0
      if (disposed || !ready) return
      if (last) phi -= Math.min(now - last, 50) * 0.00018
      last = now
      draw()
      if (!pausedRef.current && !reducedMotion.matches) {
        frame = requestAnimationFrame(tick)
      } else {
        last = 0
      }
    }

    // Each time the globe plays again, it starts over.
    let played = false
    resumeRef.current = () => {
      if (!ready) return
      if (played) phi = START
      played = true
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const observer = new ResizeObserver(() => {
      resize()
      if (ready) draw()
    })
    observer.observe(canvas)
    resize()

    const image = new Image()
    image.onload = () => {
      if (disposed) return
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, image)
      ready = true
      canvas.dataset.ready = ''
      draw()
      // At rest, the first frame stays as a still.
      if (!pausedRef.current) resumeRef.current()
    }
    image.src = LAND_MAP

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      // Free resources rather than losing the context: a remount (e.g. Strict
      // Mode) gets the same context back from the same canvas.
      for (const shader of shaders) gl.deleteShader(shader)
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
      gl.deleteTexture(texture)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role='img'
      aria-label='A dotted globe slowly spinning, with a blue marker on San Francisco.'
    />
  )
}
