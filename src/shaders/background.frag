varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform float uPulse;
uniform float uEnergy;
uniform float uSceneFocus;

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
  // Saturn sits slightly below center (~53% vertical)
  vec2 saturnCenter = center - vec2(0.0, -0.03);
  float dist = length(center);
  float saturnDist = length(saturnCenter);

  float saturnFocus = uSceneFocus;

  // Near-black base for saturn scene (#02050D)
  vec3 colCenter = mix(vec3(0.012, 0.018, 0.05), vec3(0.008, 0.02, 0.05), saturnFocus);
  vec3 colEdge = mix(vec3(0.002, 0.004, 0.018), vec3(0.004, 0.008, 0.02), saturnFocus);
  vec3 baseColor = mix(colCenter, colEdge, smoothstep(0.0, 0.9, dist));

  float n1 = noise(uv * 4.5 + vec2(uTime * 0.015, -uTime * 0.01));
  float n2 = noise(uv * 10.0 - vec2(uTime * 0.03, uTime * 0.018) + 2.8);
  float n3 = noise(uv * 2.2 + vec2(-uTime * 0.008, uTime * 0.012) + 5.1);
  float n4 = noise((uv + center * 0.25) * 16.0 + uTime * 0.02 + 7.2);

  float nebula = n1 * 0.35 + n2 * 0.25 + n3 * 0.4;
  float wisps = smoothstep(0.55, 0.82, n1) * 0.55 + smoothstep(0.6, 0.9, n2) * 0.45;
  float veil = smoothstep(0.4, 0.88, n4) * 0.18;

  // Kill purple/blue fog wash in saturn mode
  vec3 cyanWisp = vec3(0.05, 0.52, 0.82) * wisps * (0.07 + uEnergy * 0.08) * mix(1.0, 0.0, saturnFocus);
  vec3 violetWisp = vec3(0.26, 0.06, 0.42) * smoothstep(0.58, 0.82, n3) * (0.06 + uEnergy * 0.06) * mix(1.0, 0.0, saturnFocus);
  vec3 goldDust = vec3(0.34, 0.22, 0.06) * veil * (0.04 + uPulse * 0.035) * mix(1.0, 0.08, saturnFocus);

  // Sparse stars: ~200-400 visible at 1080p when saturnFocus=1（增强版）
  float star = 0.0;
  float density = mix(320.0, 240.0, saturnFocus);  // 土星模式下密度从210提升到240
  float threshold = mix(0.9975, 0.9982, saturnFocus);  // 从0.9987降到0.9982，增加星星数量
  vec2 starGrid = uv * density;
  vec2 starCell = fract(starGrid) - 0.5;
  float starField = hash(floor(starGrid));
  if (starField > threshold) {
    float twinkle = sin(uTime * 2.3 + starField * 130.0) * 0.5 + 0.5;
    float starShape = 1.0 - smoothstep(0.06, 0.34, length(starCell));
    star = smoothstep(threshold, 1.0, starField) * starShape * twinkle * mix(1.0, 0.72, saturnFocus);  // 土星模式下从0.55提升到0.72
  }

  // Very soft blue radial glow only behind saturn — not a full-screen fog（增强版）
  float softBlue = exp(-saturnDist * 3.8) * mix(0.0, 0.065 + uPulse * 0.03, saturnFocus);  // 从0.045提升到0.065
  vec3 saturnGlow = vec3(0.05, 0.18, 0.32) * softBlue;

  float pulseCore = exp(-dist * 4.1) * (0.035 + uPulse * 0.055 + uEnergy * 0.06) * mix(1.0, 0.15, saturnFocus);
  float auraRing = exp(-abs(dist - 0.22) * 5.2) * (0.008 + uEnergy * 0.014 + uPulse * 0.01) * mix(1.0, 0.0, saturnFocus);
  vec3 coreGlow = mix(vec3(0.03, 0.1, 0.2), vec3(0.18, 0.26, 0.46), uEnergy) * pulseCore;
  vec3 auraGlow = mix(vec3(0.04, 0.16, 0.28), vec3(0.22, 0.08, 0.34), nebula) * auraRing;

  float vignette = 1.0 - dist * 1.15;
  vignette = smoothstep(0.0, 1.0, vignette);

  vec3 color = baseColor + cyanWisp + violetWisp + goldDust + nebula * mix(0.016, 0.002, saturnFocus) + coreGlow + auraGlow;
  color += saturnGlow;
  color += star * vec3(0.78, 0.84, 0.98);
  color *= vignette;

  gl_FragColor = vec4(color, 1.0);
}
