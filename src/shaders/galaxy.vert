attribute vec3 aBasePosition;
attribute float aRole;
attribute float aArm;
attribute float aRadius;
attribute float aSeed;
attribute float aSize;
attribute float aTemperature;

uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
uniform float uTightness;
uniform float uSpinBoost;
uniform float uWaveStrength;
uniform float uWaveAge;
uniform vec3 uPointPos;
uniform float uPointStrength;
uniform float uCoreStrength;
uniform float uExplosionStrength;
uniform float uExplosionAge;

varying float vAlpha;
varying float vBrightness;
varying float vDust;
varying vec3 vColor;

const vec3 CORE_WHITE = vec3(1.0, 0.91, 0.72);
const vec3 DISK_BLUE = vec3(0.48, 0.82, 1.0);
const vec3 ARM_CYAN = vec3(0.24, 0.88, 1.0);
const vec3 ARM_CORAL = vec3(1.0, 0.42, 0.46);
const vec3 HALO_VIOLET = vec3(0.58, 0.46, 0.96);
const vec3 DUST_DARK = vec3(0.006, 0.009, 0.018);

mat2 rotate2d(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

vec3 burstDirection(float seed) {
  return normalize(vec3(sin(seed * 89.3), cos(seed * 59.1 + 0.7), sin(seed * 43.7 + 2.3)) + vec3(0.001));
}

void main() {
  bool isBulge = aRole < 0.5;
  bool isDisk = aRole > 0.5 && aRole < 1.5;
  bool isArm = aRole > 1.5 && aRole < 2.5;
  bool isDust = aRole > 2.5 && aRole < 3.5;
  bool isHalo = aRole > 3.5;
  vec3 pos = aBasePosition;

  float differentialSpeed = mix(0.24, 0.045, smoothstep(0.0, 1.0, aRadius));
  float rotationAngle = uTime * differentialSpeed * (1.0 + uSpinBoost * 1.8);
  if (isHalo) rotationAngle *= 0.22;
  pos.xz = rotate2d(rotationAngle) * pos.xz;
  if (isArm || isDust) {
    pos.xz = rotate2d(uTightness * (1.0 - aRadius) * 0.9) * pos.xz;
    pos.xz *= 1.0 - uTightness * (0.16 + aRadius * 0.08);
  }
  pos *= uScale;

  float waveFront = clamp(uWaveAge / 1.75, 0.0, 1.18);
  float densityWave = exp(-pow(aRadius - waveFront, 2.0) / 0.0055) * uWaveStrength;
  if (!isBulge) pos.xz *= 1.0 + densityWave * 0.045;
  pos.y += densityWave * sin(aSeed * 31.0 + uTime * 2.4) * 0.08;

  float pointDistance = distance(pos, uPointPos);
  float disturbance = exp(-pointDistance * pointDistance / 4.41) * uPointStrength;
  vec3 pointDirection = normalize(uPointPos - pos + vec3(0.001));
  pos += pointDirection * disturbance * (0.35 + aSeed * 0.58);
  pos.xz = rotate2d(disturbance * (aSeed - 0.5) * 0.42) * pos.xz;

  pos *= 1.0 - uCoreStrength * (isBulge ? 0.34 : 0.55);
  float burstIn = smoothstep(0.0, 0.46, uExplosionAge);
  float rebuild = smoothstep(0.9, 3.15, uExplosionAge);
  float burst = burstIn * (1.0 - rebuild) * uExplosionStrength;
  pos += normalize(aBasePosition + vec3(0.001)) * burst * (1.5 + aRadius * 4.1);
  pos += burstDirection(aSeed) * burst * (isHalo ? 1.2 : 0.48);
  float shock = exp(-pow(aRadius - clamp(uExplosionAge / 1.18, 0.0, 1.0), 2.0) / 0.007) * uExplosionStrength;

  vec3 stellarColor = mix(ARM_CORAL, ARM_CYAN, aTemperature);
  vColor = isBulge
    ? CORE_WHITE
    : isDisk
      ? mix(DISK_BLUE, CORE_WHITE, aTemperature * 0.34)
      : isArm
        ? stellarColor
        : isDust
          ? DUST_DARK
          : mix(HALO_VIOLET, DISK_BLUE, aTemperature * 0.42);
  if (!isDust) vColor = mix(vColor, CORE_WHITE, densityWave * 0.42 + disturbance * 0.46 + uCoreStrength * 0.36 + shock * 0.48);

  float roleBrightness = isBulge ? 1.52 : isDisk ? 0.55 : isArm ? 0.94 : isDust ? 0.12 : 0.38;
  float flicker = 0.88 + sin(uTime * (0.65 + aSeed * 1.8) + aSeed * 47.0) * 0.12;
  vBrightness = roleBrightness * flicker *
    (1.0 + densityWave * 1.55 + disturbance * 1.3 + uCoreStrength * 0.9 + shock * 1.42 + burst * 0.32);
  vAlpha = isBulge ? 0.9 : isDisk ? 0.48 : isArm ? 0.72 : isDust ? 0.5 : 0.26;
  vDust = isDust ? 1.0 : 0.0;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float viewDistance = max(0.5, -mvPosition.z);
  float roleScale = isBulge ? 1.2 : isDust ? 1.55 : isHalo ? 0.82 : 1.0;
  roleScale *= 1.0 + densityWave * 0.64 + disturbance * 0.56 + uCoreStrength * 0.24 + shock * 0.72;
  gl_PointSize = clamp(aSize * roleScale * uPixelRatio * (184.0 / viewDistance), 0.32, isDust ? 8.4 : 9.2);
}
