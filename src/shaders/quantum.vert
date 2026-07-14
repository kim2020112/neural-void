attribute vec3 aBasePosition;
attribute float aRole;
attribute float aLayer;
attribute float aSeed;
attribute float aSize;
attribute float aProgress;

uniform float uTime;
uniform float uPixelRatio;
uniform float uShellScale;
uniform float uSpinBoost;
uniform float uPulseStrength;
uniform float uPulseAge;
uniform vec3 uPointPos;
uniform float uPointStrength;
uniform float uCoreStrength;
uniform float uExplosionStrength;
uniform float uExplosionAge;

varying float vAlpha;
varying float vBrightness;
varying float vRole;
varying vec3 vColor;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const vec3 CORE_WHITE = vec3(0.92, 0.99, 1.0);
const vec3 INNER_CYAN = vec3(0.18, 0.86, 1.0);
const vec3 OUTER_VIOLET = vec3(0.54, 0.46, 1.0);
const vec3 ORBIT_CORAL = vec3(1.0, 0.38, 0.34);
const vec3 PULSE_MINT = vec3(0.58, 1.0, 0.78);

mat2 rotate2d(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

vec3 burstDirection(float seed) {
  return normalize(vec3(
    sin(seed * 83.7 + 0.4),
    cos(seed * 61.3 + 1.7),
    sin(seed * 47.9 + 2.6)
  ) + vec3(0.001));
}

void main() {
  bool isCore = aRole < 0.5;
  bool isInner = aRole > 0.5 && aRole < 1.5;
  bool isOuter = aRole > 1.5 && aRole < 2.5;
  bool isOrbit = aRole > 2.5 && aRole < 3.5;
  bool isPulse = aRole > 3.5;
  vec3 pos = aBasePosition;

  float spinDirection = isOuter ? -1.0 : 1.0;
  float spinRate = isOrbit
    ? 0.18 + aLayer * 0.055
    : isCore
      ? 0.035
      : 0.055 + aLayer * 0.018;
  pos.xz = rotate2d(uTime * spinRate * spinDirection * (1.0 + uSpinBoost * 2.2)) * pos.xz;
  if (isInner || isOuter) {
    pos.xy = rotate2d(uTime * (isInner ? 0.018 : -0.014)) * pos.xy;
  }

  float shellWeight = isInner || isOuter || isOrbit ? 1.0 : 0.0;
  pos *= mix(1.0, uShellScale, shellWeight);
  if (isCore) {
    float breath = 1.0 + sin(uTime * 1.9 + aSeed * TAU) * 0.035;
    pos *= breath * (1.0 - uCoreStrength * 0.64);
  }

  float pulseFront = clamp(uPulseAge / 1.45, 0.0, 1.15);
  float pulseWave = exp(-pow(aProgress - pulseFront, 2.0) / 0.0048) * uPulseStrength;
  float idleWave = isPulse
    ? exp(-pow(aProgress - fract(uTime * 0.12 + aSeed * 0.08), 2.0) / 0.012) * 0.22
    : 0.0;
  if (isPulse) {
    pos *= 1.0 + pulseWave * 0.22;
  }

  float pointDistance = distance(pos, uPointPos);
  float lens = exp(-pointDistance * pointDistance / 5.29) * uPointStrength;
  vec3 lensDirection = normalize(uPointPos - pos + vec3(0.001));
  pos += lensDirection * lens * (0.42 + aSeed * 0.42);
  pos.xz = rotate2d(lens * (aSeed - 0.5) * 0.22) * pos.xz;

  float charge = uCoreStrength;
  pos *= 1.0 - charge * (isCore ? 0.18 : isOrbit ? 0.48 : 0.38);

  float burstIn = smoothstep(0.0, 0.42, uExplosionAge);
  float rebuild = smoothstep(0.75, 2.85, uExplosionAge);
  float burst = burstIn * (1.0 - rebuild) * uExplosionStrength;
  vec3 radial = normalize(aBasePosition + burstDirection(aSeed) * 0.18);
  pos += radial * burst * (2.0 + aProgress * 2.9 + aSeed * 0.8);
  pos += burstDirection(aSeed) * burst * (isCore ? 0.9 : 0.36);
  float shockRadius = clamp(uExplosionAge / 1.1, 0.0, 1.0);
  float shock = exp(-pow(length(aBasePosition) / 5.2 - shockRadius, 2.0) / 0.009) * uExplosionStrength;

  vColor = isCore
    ? CORE_WHITE
    : isInner
      ? INNER_CYAN
      : isOuter
        ? OUTER_VIOLET
        : isOrbit
          ? ORBIT_CORAL
          : PULSE_MINT;
  vColor = mix(vColor, CORE_WHITE, charge * 0.5 + pulseWave * 0.56 + shock * 0.42);
  vColor = mix(vColor, PULSE_MINT, lens * 0.5);

  float roleBrightness = isCore ? 1.38 : isOrbit ? 1.02 : isPulse ? 0.7 : 0.82;
  float flicker = 0.91 + sin(uTime * (0.8 + aSeed * 1.5) + aSeed * 41.0) * 0.09;
  vBrightness = roleBrightness * flicker *
    (1.0 + pulseWave * 2.1 + idleWave * 0.8 + lens * 1.2 + charge * 0.85 + shock * 1.45 + burst * 0.42);
  vAlpha = isPulse ? 0.2 + max(pulseWave, idleWave) * 0.72 : isCore ? 0.9 : isOrbit ? 0.8 : 0.66;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float viewDistance = max(0.5, -mvPosition.z);
  float pointScale = 1.0 + pulseWave * 0.7 + lens * 0.58 + charge * 0.35 + shock * 0.75;
  gl_PointSize = clamp(aSize * pointScale * uPixelRatio * (175.0 / viewDistance), 0.35, 9.2);
  vRole = aRole;
}
