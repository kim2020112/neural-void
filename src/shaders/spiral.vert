attribute vec3 aBasePosition;
attribute float aRole;
attribute float aFilament;
attribute float aProgress;
attribute float aNode;
attribute float aSeed;
attribute float aSize;

uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
uniform float uRewind;
uniform float uGrowthStrength;
uniform float uGrowthAge;
uniform float uSelectedNode;
uniform float uPointStrength;
uniform float uPointAge;
uniform float uCoreStrength;
uniform float uExplosionStrength;
uniform float uExplosionAge;

varying float vAlpha;
varying float vBrightness;
varying float vRole;
varying vec3 vColor;

const float TAU = 6.28318530718;
const vec3 SEED_WHITE = vec3(1.0, 0.98, 0.84);
const vec3 PHI_GOLD = vec3(1.0, 0.66, 0.16);
const vec3 CITRUS = vec3(0.86, 1.0, 0.28);
const vec3 GROWTH_GREEN = vec3(0.28, 1.0, 0.62);
const vec3 SCALE_CYAN = vec3(0.35, 0.9, 1.0);

mat2 rotate2d(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

vec3 burstDirection(float seed) {
  return normalize(vec3(sin(seed * 79.1), cos(seed * 53.7 + 0.5), sin(seed * 41.3 + 2.4)) + vec3(0.001));
}

void main() {
  bool isCore = aRole < 0.5;
  bool isFilament = aRole > 0.5 && aRole < 1.5;
  bool isFront = aRole > 1.5 && aRole < 2.5;
  bool isDust = aRole > 2.5;
  vec3 pos = aBasePosition;

  float rewindScale = mix(1.0, 0.14 + aProgress * 0.22, uRewind);
  if (!isCore) {
    pos.xz *= rewindScale;
    pos.xz = rotate2d(-uRewind * (1.0 - aProgress) * 1.15) * pos.xz;
  } else {
    pos *= 1.0 - uRewind * 0.48;
  }
  pos *= uScale;
  pos.xz = rotate2d(uTime * (0.025 + (1.0 - aProgress) * 0.018)) * pos.xz;

  float growthFront = clamp(uGrowthAge / 1.85, 0.0, 1.15);
  float growthWave = exp(-pow(aProgress - growthFront, 2.0) / 0.0045) * uGrowthStrength;
  if (!isCore) pos *= 1.0 + growthWave * (isFront ? 0.12 : 0.045);

  float selectedProgress = uSelectedNode / 12.0;
  float pointFront = clamp(uPointAge / 1.5, 0.0, 1.15);
  float nodeWave = exp(-pow(abs(aProgress - selectedProgress) - pointFront * 0.42, 2.0) / 0.003) * uPointStrength;
  float selectedNode = aNode > -0.5 && abs(aNode - uSelectedNode) < 0.45 ? uPointStrength : 0.0;
  pos.y += (nodeWave + selectedNode) * sin(aSeed * TAU + uTime * 2.2) * 0.07;

  pos *= 1.0 - uCoreStrength * (isCore ? 0.22 : 0.62);
  float burstIn = smoothstep(0.0, 0.42, uExplosionAge);
  float rebuild = smoothstep(0.82, 2.95, uExplosionAge);
  float burst = burstIn * (1.0 - rebuild) * uExplosionStrength;
  pos += normalize(aBasePosition + vec3(0.001)) * burst * (1.8 + aProgress * 3.2);
  pos += burstDirection(aSeed) * burst * (isDust ? 1.15 : 0.52);
  float shock = exp(-pow(length(aBasePosition) / 5.3 - clamp(uExplosionAge / 1.15, 0.0, 1.0), 2.0) / 0.008) * uExplosionStrength;

  float filamentMix = max(0.0, aFilament) / 3.0;
  vColor = isCore
    ? SEED_WHITE
    : isFront
      ? GROWTH_GREEN
      : isDust
        ? SCALE_CYAN
        : mix(PHI_GOLD, CITRUS, filamentMix * 0.72);
  vColor = mix(vColor, SEED_WHITE, growthWave * 0.62 + nodeWave * 0.5 + selectedNode * 0.72 + uCoreStrength * 0.34 + shock * 0.4);

  float roleBrightness = isCore ? 1.46 : isFront ? 1.3 : isDust ? 0.62 : 0.84;
  float flicker = 0.92 + sin(uTime * (0.7 + aSeed * 1.2) + aSeed * 39.0) * 0.08;
  vBrightness = roleBrightness * flicker *
    (1.0 + growthWave * 1.9 + nodeWave * 1.55 + selectedNode * 1.5 + uCoreStrength * 0.82 + shock * 1.25 + burst * 0.35);
  vAlpha = isDust ? 0.42 : isCore ? 0.92 : isFront ? 0.84 : 0.72;
  vAlpha *= 1.0 - uRewind * (isCore ? 0.0 : aProgress * 0.48);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float viewDistance = max(0.5, -mvPosition.z);
  float pointScale = 1.0 + growthWave * 0.76 + nodeWave * 0.6 + selectedNode * 0.92 + uCoreStrength * 0.24 + shock * 0.62;
  gl_PointSize = clamp(aSize * pointScale * uPixelRatio * (178.0 / viewDistance), 0.34, 9.4);
  vRole = aRole;
}
