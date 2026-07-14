attribute vec3 aOffset;
attribute float aRole;
attribute float aStrand;
attribute float aParameter;
attribute float aSeed;
attribute float aSize;

uniform float uTime;
uniform float uPixelRatio;
uniform float uTightness;
uniform float uSpreadScale;
uniform float uSpinBoost;
uniform float uSelectedParameter;
uniform float uPointStrength;
uniform float uPointAge;
uniform float uCoreStrength;
uniform float uExplosionStrength;
uniform float uExplosionAge;

varying float vAlpha;
varying float vBrightness;
varying float vRole;
varying vec3 vColor;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const vec3 AMBER = vec3(1.0, 0.64, 0.2);
const vec3 CYAN = vec3(0.2, 0.9, 1.0);
const vec3 MAGENTA = vec3(0.95, 0.34, 0.76);
const vec3 HOT_WHITE = vec3(1.0, 0.97, 0.86);

mat2 rotate2d(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

vec3 knotPoint(float parameter, float strand, float tightness, float spreadScale) {
  float angle = parameter * TAU;
  float strandPhase = strand * TAU / 3.0;
  float tubeAngle = 3.0 * angle + strandPhase;
  float majorRadius = 3.55 * (1.0 - tightness * 0.18);
  float tubeRadius = 0.82 * spreadScale * (1.0 - tightness * 0.24);
  float radial = majorRadius + cos(tubeAngle) * tubeRadius;
  float pathAngle = 2.0 * angle;
  return vec3(cos(pathAngle) * radial, sin(tubeAngle) * tubeRadius * 1.08, sin(pathAngle) * radial);
}

vec3 burstDirection(float seed) {
  return normalize(vec3(sin(seed * 73.0), cos(seed * 51.0 + 0.8), sin(seed * 37.0 + 2.1)) + vec3(0.001));
}

float circularDistance(float first, float second) {
  float distanceValue = abs(first - second);
  return min(distanceValue, 1.0 - distanceValue);
}

void main() {
  bool isStrand = aRole < 0.5;
  bool isHotspot = aRole > 0.5 && aRole < 1.5;
  bool isSpark = aRole > 1.5;
  float parameter = fract(aParameter + (isSpark ? uTime * (0.075 + uSpinBoost * 0.09) : 0.0));
  vec3 pos = knotPoint(parameter, aStrand, uTightness, uSpreadScale) + aOffset;
  pos.xz = rotate2d(uTime * (0.055 + uSpinBoost * 0.2)) * pos.xz;
  pos.xy = rotate2d(sin(uTime * 0.16) * 0.055) * pos.xy;

  float pointFront = clamp(uPointAge / 1.65, 0.0, 0.52);
  float distanceFromSelection = circularDistance(parameter, uSelectedParameter);
  float pointWave = exp(-pow(distanceFromSelection - pointFront, 2.0) / 0.0018) * uPointStrength;
  float selectedGlow = exp(-distanceFromSelection * distanceFromSelection / 0.0012) * uPointStrength;
  pos *= 1.0 + pointWave * 0.035 + selectedGlow * 0.018;

  pos *= 1.0 - uCoreStrength * (isHotspot ? 0.48 : 0.58);
  float burstIn = smoothstep(0.0, 0.4, uExplosionAge);
  float rebuild = smoothstep(0.68, 2.65, uExplosionAge);
  float burst = burstIn * (1.0 - rebuild) * uExplosionStrength;
  pos += normalize(pos + vec3(0.001)) * burst * (2.2 + aSeed * 1.6);
  pos += burstDirection(aSeed) * burst * (isSpark ? 1.25 : 0.62);
  float shock = exp(-pow(length(pos) / 5.1 - clamp(uExplosionAge / 1.0, 0.0, 1.0), 2.0) / 0.008) * uExplosionStrength;

  vColor = aStrand < 0.5 ? AMBER : aStrand < 1.5 ? CYAN : MAGENTA;
  if (isHotspot) vColor = mix(vColor, HOT_WHITE, 0.76);
  if (isSpark) vColor = mix(vColor, HOT_WHITE, 0.4);
  vColor = mix(vColor, HOT_WHITE, pointWave * 0.75 + selectedGlow * 0.6 + uCoreStrength * 0.35 + shock * 0.45);

  float crossingPulse = isHotspot ? 0.72 + 0.28 * sin(uTime * 2.8 + aParameter * TAU * 6.0) : 1.0;
  float roleBrightness = isHotspot ? 1.65 : isSpark ? 1.28 : 0.82;
  vBrightness = roleBrightness * crossingPulse *
    (1.0 + pointWave * 2.2 + selectedGlow * 1.1 + uCoreStrength * 0.9 + shock * 1.2 + burst * 0.38);
  vAlpha = isHotspot ? 0.94 : isSpark ? 0.82 : 0.7;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float viewDistance = max(0.5, -mvPosition.z);
  float roleScale = isHotspot ? 1.32 : isSpark ? 1.16 : 1.0;
  roleScale *= 1.0 + pointWave * 0.82 + selectedGlow * 0.45 + uCoreStrength * 0.28 + shock * 0.6;
  gl_PointSize = clamp(aSize * roleScale * uPixelRatio * (172.0 / viewDistance), 0.34, 9.5);
  vRole = aRole;
}
