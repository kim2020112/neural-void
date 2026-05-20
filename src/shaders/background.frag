varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;

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
  float dist = length(center);

  // Deep space gradient: dark navy at center, near-black at edges
  vec3 colCenter = vec3(0.02, 0.01, 0.08);
  vec3 colEdge = vec3(0.0, 0.0, 0.015);
  vec3 baseColor = mix(colCenter, colEdge, dist * 1.8);

  // Subtle energy field — large slow-moving noise layers
  float n1 = noise(uv * 6.0 + uTime * 0.02);
  float n2 = noise(uv * 12.0 - uTime * 0.015 + 2.8);
  float n3 = noise(uv * 3.0 + uTime * 0.008 + 5.1);

  // Combine noise into a subtle nebula effect
  float nebula = n1 * 0.4 + n2 * 0.3 + n3 * 0.3;

  // Add faint cyan/magenta energy wisps
  vec3 cyanWisp = vec3(0.0, 0.6, 0.8) * smoothstep(0.55, 0.7, n1) * 0.06;
  vec3 magentaWisp = vec3(0.5, 0.0, 0.6) * smoothstep(0.55, 0.7, n2) * 0.05;

  // Star field — sparse, twinkling
  float star = 0.0;
  float starField = hash(floor(uv * 300.0));
  if (starField > 0.998) {
    float twinkle = sin(uTime * 2.5 + hash(floor(uv * 300.0)) * 100.0) * 0.5 + 0.5;
    star = smoothstep(0.998, 1.0, starField) * twinkle * 0.9;
  }

  // Vignette
  float vignette = 1.0 - dist * 1.6;
  vignette = smoothstep(0.0, 1.0, vignette);

  vec3 color = baseColor + cyanWisp + magentaWisp + nebula * 0.015;
  color += star * 0.7;
  color *= vignette;

  gl_FragColor = vec4(color, 1.0);
}
