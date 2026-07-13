attribute vec3 aBasePosition;
attribute float aType;
attribute float aLane;
attribute float aSeed;
attribute float aSize;
attribute float aBrightness;
attribute float aAngularSpeed;

varying float vType;
varying float vBrightness;
varying float vAlpha;
varying float vFrontRing;
varying float vLane;
varying float vGestureGlow;
varying vec3 vColor;

uniform float uTime;
uniform float uPixelRatio;
uniform float uBreath;
uniform float uRingScale;
uniform float uSpinBoost;
uniform float uWave;
uniform float uWaveOrigin;
uniform float uWaveAge;
uniform vec3 uPointPos;
uniform float uPointStrength;
uniform float uPointRadius;
uniform float uPointMaxDisplace;
uniform float uCoreBoost;
uniform float uReleaseAge;
uniform float uReleaseStrength;
uniform float uVortexStrength;
uniform vec3 uVortexCenter;
uniform float uBlastStrength;
uniform vec3 uBlastOrigin;

const vec3 COL_CORE = vec3(0.92, 0.98, 1.0);
const vec3 COL_PLANET_DEEP = vec3(0.016, 0.106, 0.227);
const vec3 COL_PLANET_BRIGHT = vec3(0.15, 0.78, 1.0);
const vec3 COL_RING_PALE = vec3(1.0, 0.92, 0.72);
const vec3 COL_RING_GOLD = vec3(1.0, 0.76, 0.28);
const vec3 COL_RING_ORANGE = vec3(1.0, 0.42, 0.08);
const vec3 COL_HOT = vec3(1.0, 0.97, 0.88);

float saturate(float value) {
  return clamp(value, 0.0, 1.0);
}

float angleDistance(float a, float b) {
  return abs(atan(sin(a - b), cos(a - b)));
}

vec3 rotateY(vec3 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
}

vec3 planetColor(float seed, float typeId) {
  if (typeId < 0.5) return mix(COL_CORE, COL_PLANET_BRIGHT, seed * 0.42);
  float latitude = abs(aBasePosition.y) / 1.16;
  return mix(COL_PLANET_BRIGHT, COL_PLANET_DEEP, saturate(latitude * 0.9 + seed * 0.34));
}

vec3 ringColor(float seed, float lane, float typeId) {
  if (typeId > 3.5) return mix(COL_HOT, vec3(1.0), 0.4 + seed * 0.25);
  if (typeId > 2.5) return mix(COL_RING_ORANGE * 0.52, COL_RING_GOLD * 0.7, seed);
  if (lane < 0.5) return mix(COL_PLANET_BRIGHT * 0.72, COL_RING_GOLD, 0.28 + seed * 0.44);
  if (lane > 1.5 && lane < 2.5) return mix(COL_RING_GOLD, COL_RING_PALE, 0.22 + seed * 0.5);
  if (lane > 2.5) return mix(COL_RING_ORANGE * 0.48, COL_RING_GOLD * 0.64, seed * 0.62);
  return mix(COL_RING_ORANGE, COL_RING_GOLD, 0.42 + seed * 0.4);
}

void main() {
  vType = aType;
  vLane = aLane;
  vGestureGlow = 0.0;
  float seed = aSeed;
  float typeId = aType;
  bool isPlanet = typeId < 1.5;
  bool isRingish = typeId > 1.5;
  float angle = isPlanet
    ? uTime * 0.032 * (1.0 + uSpinBoost * 0.22)
    : uTime * aAngularSpeed * (1.0 + uSpinBoost);
  vec3 pos = rotateY(aBasePosition, angle);

  if (isPlanet) {
    float breath = mix(0.98, 1.02, uBreath);
    pos *= breath * (1.0 + uCoreBoost * 0.035);
  }

  if (isRingish) {
    float radial = length(pos.xz) + 0.0001;
    float ringAngle = atan(pos.z, pos.x);

    if (uVortexStrength > 0.01) {
      vec3 toCenter = uVortexCenter - pos;
      float distanceToCenter = length(toCenter.xz);
      float influence = exp(-distanceToCenter * 0.28) * uVortexStrength;
      pos = rotateY(pos, influence * distanceToCenter * 0.62);
      pos.xz *= 1.0 - influence * 0.07;
      pos.y += sin(ringAngle * 8.0 + uTime * 3.5) * influence * 0.09;
    }

    if (uBlastStrength > 0.01) {
      vec3 fromBlast = pos - uBlastOrigin;
      float distanceToBlast = length(fromBlast.xz);
      float influence = exp(-distanceToBlast * distanceToBlast / 6.0) * uBlastStrength;
      vec2 radialDirection = normalize(pos.xz + vec2(0.0001));
      pos.xz += radialDirection * influence * 0.22;
      pos.y += sin(ringAngle * 6.0 - uTime * 2.8) * influence * 0.15;
    }

    radial = length(pos.xz) + 0.0001;
    ringAngle = atan(pos.z, pos.x);
    float waveDistance = angleDistance(ringAngle, uWaveOrigin);
    float waveFront = mod(max(0.0, uWaveAge) * 2.35, 3.75);
    float laneDelay = max(0.0, aLane) * 0.065;
    float waveDelta = waveDistance - max(0.0, waveFront - laneDelay);
    float wavePulse = exp(-waveDelta * waveDelta / 0.12) * uWave;

    float releaseEnvelope = uReleaseStrength * exp(-max(0.0, uReleaseAge) * 1.65);
    float releaseCenter = 1.1 + max(0.0, uReleaseAge) * 5.7;
    float releaseDelta = radial - releaseCenter;
    float releaseWave = exp(-releaseDelta * releaseDelta / 0.2) * releaseEnvelope;
    float scale = uRingScale + wavePulse * (0.05 + max(0.0, aLane) * 0.006) + releaseWave * 0.18;
    pos.xz *= scale;
    pos.y *= 1.0 - uSpinBoost * 0.28;
    pos.y += sin(ringAngle * 4.0 + seed * 18.0) * wavePulse * 0.055;
    pos.y += (seed - 0.5) * releaseWave * 0.22;
    pos.y += (seed - 0.5) * 0.014 * (1.0 - uPointStrength * 0.65) * sin(uTime * 0.82 + seed * 14.0);
    vGestureGlow = max(wavePulse * 0.86, releaseWave * 1.2);
  }

  float pointHighlight = 0.0;
  if (isRingish && uPointStrength > 0.01) {
    vec3 toPoint = uPointPos - pos;
    float distanceToPoint = length(toPoint);
    float influence = exp(-distanceToPoint * distanceToPoint / (uPointRadius * uPointRadius)) * uPointStrength;
    pointHighlight = influence;
    if (influence > 0.001) {
      vec3 radialDirection = normalize(vec3(pos.x, 0.0, pos.z) + vec3(0.001));
      vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), radialDirection));
      float swirl = sin(uTime * 4.2 + seed * 13.0);
      vec3 pullDirection = normalize(toPoint + tangent * (0.9 + swirl * 0.16));
      float displacement = min(uPointMaxDisplace, influence * uPointMaxDisplace);
      pos += pullDirection * displacement;
      pos.y += swirl * influence * 0.075;
    }
    vGestureGlow = max(vGestureGlow, pointHighlight);
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vec4 centerView = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float ringFront = smoothstep(-0.55, 0.55, mvPosition.z - centerView.z);
  vFrontRing = isRingish ? ringFront : 1.0;
  vColor = isPlanet ? planetColor(seed, typeId) : ringColor(seed, aLane, typeId);
  if (pointHighlight > 0.05) vColor = mix(vColor, COL_HOT, saturate(pointHighlight * 1.55));
  if (isRingish && uSpinBoost > 0.05 && aLane > 1.5 && aLane < 2.5) {
    vColor = mix(vColor, COL_RING_PALE, uSpinBoost * 0.42);
  }

  float bright = aBrightness;
  if (isRingish) {
    bright *= mix(0.5, 1.12, ringFront);
    bright *= 1.0 + vGestureGlow * 0.72 + uSpinBoost * 0.28;
  }
  if (typeId < 0.5 || typeId > 3.5) {
    bright *= 1.04 + 0.3 * sin(uTime * (2.1 + seed * 2.4) + seed * 28.0);
  }
  if (typeId < 0.5) bright *= 1.0 + uCoreBoost * 0.42 + uVortexStrength * 0.62;
  if (typeId > 3.5) bright *= 1.12 + 0.22 * sin(uTime * 3.5 + seed * 42.0);
  vBrightness = bright;

  gl_Position = projectionMatrix * mvPosition;
  float viewDistance = max(0.5, -mvPosition.z);
  float sizeBoost = 1.0;
  if (typeId < 0.5) sizeBoost = 1.18;
  if (typeId > 3.5) sizeBoost = 1.32;
  if (typeId > 1.5 && typeId < 2.5 && aLane > 1.5 && aLane < 2.5) sizeBoost = 1.1;
  sizeBoost *= 1.0 + vGestureGlow * 0.26;
  gl_PointSize = aSize * sizeBoost * uPixelRatio * (165.0 / viewDistance);
  float maxPointSize = typeId > 3.5 ? 7.5 : typeId < 0.5 ? 6.2 : 5.0;
  gl_PointSize = clamp(gl_PointSize, 0.42, maxPointSize);
  vAlpha = smoothstep(42.0, 5.0, viewDistance) * (0.76 + uBreath * 0.08);
}
