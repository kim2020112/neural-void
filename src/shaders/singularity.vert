attribute vec3 aBasePosition;
attribute float aType;
attribute float aSeed;
attribute float aSize;
attribute float aBrightness;
attribute float aAngularSpeed;

uniform float uTime;
uniform float uPixelRatio;
uniform float uDiskScale;
uniform float uSpinBoost;
uniform float uCoreIntensity;
uniform float uCompression;
uniform vec3 uPointPos;
uniform float uPointStrength;
uniform float uPointRadius;
uniform float uPointMaxDisplace;
uniform float uShockStrength;
uniform float uShockAge;
uniform vec3 uShockOrigin;
uniform float uExplosionStrength;
uniform float uExplosionAge;
uniform float uBreath;

varying float vType;
varying float vBrightness;
varying float vAlpha;
varying float vHeat;
varying float vInteraction;
varying vec3 vColor;

const vec3 COL_WHITE = vec3(1.0, 0.98, 0.9);
const vec3 COL_GOLD = vec3(1.0, 0.63, 0.16);
const vec3 COL_ORANGE = vec3(1.0, 0.19, 0.025);
const vec3 COL_CYAN = vec3(0.18, 0.84, 1.0);
const vec3 COL_DEEP_CYAN = vec3(0.02, 0.24, 0.42);

vec3 rotateY(vec3 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
}

float saturate(float value) {
  return clamp(value, 0.0, 1.0);
}

void main() {
  float typeId = aType;
  bool isDisk = typeId < 1.5;
  bool isHalo = typeId > 1.5 && typeId < 2.5;
  bool isJet = typeId > 2.5;
  float spin = isJet ? 0.55 : 1.0 + uSpinBoost;
  vec3 pos = rotateY(aBasePosition, uTime * aAngularSpeed * spin);
  float baseRadius = length(aBasePosition.xz);
  float interactionGlow = 0.0;

  if (isDisk) {
    float inwardBias = 1.0 - uCompression * (0.05 + 0.09 * saturate(3.8 / max(1.0, baseRadius)));
    pos = rotateY(pos, uCompression * (0.3 + 1.35 / max(1.0, baseRadius)));
    pos.xz *= uDiskScale * inwardBias;
    pos.y *= 1.0 - uCompression * 0.55;

    float shockRadius = 0.8 + uShockAge * 5.8;
    float shockDistance = abs(length((pos - uShockOrigin).xz) - shockRadius);
    float shock = exp(-shockDistance * shockDistance / 0.12) * uShockStrength * exp(-uShockAge * 1.35);
    pos.xz *= 1.0 + shock * 0.085;
    pos.y += (aSeed - 0.5) * shock * 0.32;
    interactionGlow = max(interactionGlow, shock);
  }

  if (isHalo) {
    pos = rotateY(pos, sin(uTime * 0.11 + aSeed * 8.0) * 0.12);
    pos *= 1.0 - uCompression * 0.055;
  }

  if (isJet) {
    float jetBoost = 1.0 + uCoreIntensity * 0.18 + uExplosionStrength * 0.72;
    pos.y *= jetBoost;
    pos.xz *= 0.92 + uCoreIntensity * 0.08;
    pos = rotateY(pos, uTime * (0.2 + aSeed * 0.16));
    interactionGlow = max(interactionGlow, uCoreIntensity * 0.55 + uExplosionStrength);
  }

  if (!isJet && uPointStrength > 0.001) {
    vec3 toPoint = uPointPos - pos;
    float distanceToPoint = length(toPoint);
    float influence = exp(-distanceToPoint * distanceToPoint / (uPointRadius * uPointRadius)) * uPointStrength;
    if (influence > 0.001) {
      vec3 radialDirection = normalize(vec3(pos.x, 0.0, pos.z) + vec3(0.001));
      vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), radialDirection));
      vec3 lensDirection = normalize(toPoint + tangent * (0.7 + 0.2 * sin(aSeed * 31.0 + uTime * 3.2)));
      pos += lensDirection * min(uPointMaxDisplace, influence * uPointMaxDisplace);
      interactionGlow = max(interactionGlow, influence);
    }
  }

  if (!isJet && uExplosionStrength > 0.001) {
    float radius = length(pos) + 0.001;
    float front = 1.05 + uExplosionAge * 5.4;
    float wave = exp(-pow(radius - front, 2.0) / 0.2) * uExplosionStrength;
    pos += normalize(pos) * wave * (0.72 + aSeed * 0.48);
    pos.y += (aSeed - 0.5) * wave * 0.55;
    interactionGlow = max(interactionGlow, wave);
  }

  float heat = isDisk ? saturate(1.0 - (baseRadius - 1.45) / 4.7) : 0.0;
  if (typeId < 0.5) vColor = mix(COL_ORANGE, COL_GOLD, 0.34 + heat * 0.46);
  else if (typeId < 1.5) vColor = mix(COL_GOLD, COL_WHITE, 0.58 + heat * 0.32);
  else if (typeId < 2.5) vColor = mix(COL_DEEP_CYAN, COL_GOLD * 0.48, aSeed * 0.5);
  else vColor = mix(COL_CYAN, COL_WHITE, (1.0 - saturate(abs(aBasePosition.y) / 6.8)) * 0.42);
  vColor = mix(vColor, COL_WHITE, saturate(interactionGlow * 0.44));

  float flicker = 0.88 + 0.12 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 37.0);
  float bright = aBrightness * flicker;
  if (typeId < 1.5) bright *= 1.0 + uCoreIntensity * (0.25 + heat * 0.42);
  if (typeId > 2.5) bright *= 1.0 + uCoreIntensity * 0.62 + uExplosionStrength * 1.2;
  bright *= 1.0 + interactionGlow * 0.95;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float viewDistance = max(0.5, -mvPosition.z);
  float sizeBoost = typeId < 0.5 ? 0.92 : typeId < 1.5 ? 1.32 : typeId < 2.5 ? 0.78 : 1.08;
  sizeBoost *= 1.0 + interactionGlow * 0.28;
  gl_PointSize = clamp(aSize * sizeBoost * uPixelRatio * (168.0 / viewDistance), 0.38, typeId < 1.5 ? 7.2 : 5.4);

  vType = typeId;
  vBrightness = bright;
  vHeat = heat;
  vInteraction = interactionGlow;
  vAlpha = (0.7 + uBreath * 0.08) * (isHalo ? 0.52 : 1.0);
}
