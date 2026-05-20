attribute float aSize;
attribute vec3 aColor;

varying vec3 vColor;
varying float vAlpha;

uniform float uTime;
uniform float uPixelRatio;
uniform vec2 uMouse;
uniform float uParticleCount;

// 3D Simplex noise implementation
vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Curl noise: rotation of the gradient of a noise field
vec3 curlNoise(vec3 p, float t) {
  float eps = 0.5;
  float n1 = snoise(p + vec3(eps, 0.0, 0.0) + t * 0.1);
  float n2 = snoise(p + vec3(-eps, 0.0, 0.0) + t * 0.1);
  float n3 = snoise(p + vec3(0.0, eps, 0.0) + t * 0.1);
  float n4 = snoise(p + vec3(0.0, -eps, 0.0) + t * 0.1);
  float n5 = snoise(p + vec3(0.0, 0.0, eps) + t * 0.1);
  float n6 = snoise(p + vec3(0.0, 0.0, -eps) + t * 0.1);

  float x = n4 - n3;
  float y = n6 - n5;
  float z = n1 - n2;

  float denom = 2.0 * eps;
  return vec3(x, y, z) / denom;
}

void main() {
  vec3 pos = position;

  // Multi-octave curl noise for fluid-like motion
  float scale1 = 0.6;
  float scale2 = 0.25;
  float scale3 = 0.1;

  vec3 curl1 = curlNoise(pos * scale1, uTime * 0.3);
  vec3 curl2 = curlNoise(pos * scale2 + 100.0, uTime * 0.5);
  vec3 curl3 = curlNoise(pos * scale3 - 50.0, uTime * 0.2);

  vec3 velocity = curl1 * 0.5 + curl2 * 0.3 + curl3 * 0.2;

  // Subtle mouse influence: bias flow toward cursor
  vec3 mouseInfluence = vec3(uMouse.x * 0.8, uMouse.y * 0.5, uMouse.x * 0.3);
  velocity += mouseInfluence * 0.15;

  // Displacement accumulates over time — particles drift slowly
  vec3 displaced = pos + velocity * 2.5;

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Point size with depth attenuation
  float dist = length(mvPosition.xyz);
  gl_PointSize = aSize * uPixelRatio * (180.0 / -mvPosition.z);
  gl_PointSize = clamp(gl_PointSize, 0.5, 8.0);

  // Pass color to fragment
  vColor = aColor;

  // Alpha fades at extreme distances for depth feel
  vAlpha = smoothstep(30.0, 5.0, dist);
}
