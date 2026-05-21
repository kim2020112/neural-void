varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform float uPulse;
uniform float uEnergy;
uniform float uSaturnFocus;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

void main() {
  vec2 uv = vUv;
  vec2 center = uv - 0.5;
  center.x *= uResolution.x / max(uResolution.y, 0.001);
  float dist = length(center);

  float saturnFocus = uSaturnFocus;
  vec3 colCenter = mix(vec3(0.028, 0.034, 0.11), vec3(0.012, 0.014, 0.04), saturnFocus);
  vec3 colEdge = mix(vec3(0.002, 0.004, 0.018), vec3(0.001, 0.002, 0.008), saturnFocus);
  vec3 baseColor = mix(colCenter, colEdge, smoothstep(0.0, 0.85, dist));

  float n1 = noise(uv * 4.5 + vec2(uTime * 0.015, -uTime * 0.01));
  float n2 = noise(uv * 10.0 - vec2(uTime * 0.03, uTime * 0.018) + 2.8);
  float n3 = noise(uv * 2.2 + vec2(-uTime * 0.008, uTime * 0.012) + 5.1);
  float n4 = noise((uv + center * 0.25) * 16.0 + uTime * 0.02 + 7.2);

  float nebula = n1 * 0.35 + n2 * 0.25 + n3 * 0.4;
  float wisps = smoothstep(0.55, 0.82, n1) * 0.55 + smoothstep(0.6, 0.9, n2) * 0.45;
  float veil = smoothstep(0.4, 0.88, n4) * 0.18;

  vec3 cyanWisp = vec3(0.05, 0.52, 0.82) * wisps * (0.15 + uEnergy * 0.18) * mix(1.0, 0.38, saturnFocus);
  vec3 violetWisp = vec3(0.26, 0.06, 0.42) * smoothstep(0.58, 0.82, n3) * (0.15 + uEnergy * 0.1) * mix(1.0, 0.34, saturnFocus);
  vec3 goldDust = vec3(0.34, 0.22, 0.06) * veil * (0.12 + uPulse * 0.08) * mix(1.0, 0.3, saturnFocus);

  float star = 0.0;
  float starField = hash(floor(uv * 320.0));
  if (starField > mix(0.9975, 0.9991, saturnFocus)) {
    float twinkle = sin(uTime * 2.3 + hash(floor(uv * 320.0)) * 130.0) * 0.5 + 0.5;
    star = smoothstep(0.9975, 1.0, starField) * twinkle;
  }

  float pulseCore = exp(-dist * 4.1) * (0.12 + uPulse * 0.16 + uEnergy * 0.18);
  float auraRing = exp(-abs(dist - 0.22) * 5.2) * (0.025 + uEnergy * 0.045 + uPulse * 0.03);
  vec3 coreGlow = mix(vec3(0.03, 0.1, 0.2), vec3(0.18, 0.26, 0.46), uEnergy) * pulseCore;
  vec3 auraGlow = mix(vec3(0.04, 0.16, 0.28), vec3(0.22, 0.08, 0.34), nebula) * auraRing;

  float vignette = 1.0 - dist * 1.15;
  vignette = smoothstep(0.0, 1.0, vignette);

  vec3 color = baseColor + cyanWisp + violetWisp + goldDust + nebula * mix(0.045, 0.016, saturnFocus) + coreGlow + auraGlow * mix(1.0, 0.42, saturnFocus);
  color += star * vec3(0.78, 0.84, 0.98) * mix(1.0, 0.42, saturnFocus);
  color *= vignette;

  gl_FragColor = vec4(color, 1.0);
}
