// GLSL: the closest point of an n-point Spherical Fibonacci lattice to the
// unit vector `p` (z is the pole), after Keinert et al., "Spherical Fibonacci
// Mapping", and Inigo Quilez (shadertoy.com/view/lllXz4). Needs PI and PHI.
export const NEAREST_FIBONACCI = `
vec3 nearestFibonacci(vec3 p, float n) {
  float m = 1.0 - 1.0 / n;
  float phi = min(atan(p.y, p.x), PI);
  float cosTheta = p.z;
  float k = max(2.0, floor(log(n * PI * sqrt(5.0) * (1.0 - cosTheta * cosTheta)) / log(PHI * PHI)));
  float Fk = pow(PHI, k) / sqrt(5.0);
  vec2 F = floor(vec2(Fk, Fk * PHI) + 0.5);
  vec2 ka = 2.0 * F / n;
  vec2 kb = 2.0 * PI * (fract((F + 1.0) * PHI) - (PHI - 1.0));
  mat2 iB = mat2(ka.y, -ka.x, kb.y, -kb.x) / (ka.y * kb.x - ka.x * kb.y);
  vec2 c = floor(iB * vec2(phi, cosTheta - m));
  float best = 8.0;
  vec3 nearest = p;
  for (int s = 0; s < 4; s++) {
    vec2 uv = vec2(float(s - 2 * (s / 2)), float(s / 2));
    float i = clamp(dot(F, uv + c), 0.0, n - 1.0);
    float a = 2.0 * PI * fract(i * PHI);
    float z = m - 2.0 * i / n;
    float r = sqrt(max(0.0, 1.0 - z * z));
    vec3 q = vec3(cos(a) * r, sin(a) * r, z);
    float d = dot(q - p, q - p);
    if (d < best) { best = d; nearest = q; }
  }
  return nearest;
}
`
