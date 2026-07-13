attribute float aProgress;
attribute float aPairClass;
attribute float aSide;

uniform float uRadiusScale;
uniform float uHeightScale;
uniform float uTwist;
uniform float uUnzip;
uniform float uScanProgress;
uniform float uScanStrength;
uniform float uScanAge;
uniform float uCoreStrength;
uniform float uReplicationStrength;
uniform float uReplicationAge;
uniform float uReplicationOrigin;

varying float vAlpha;
varying float vGlow;
varying vec3 vColor;

const float TAU = 6.28318530718;
const float DNA_TURNS = 5.2;
const vec3 COL_CYAN = vec3(0.36, 0.88, 1.0);
const vec3 COL_VIOLET = vec3(0.66, 0.52, 1.0);
const vec3 COL_GOLD = vec3(1.0, 0.78, 0.34);
const vec3 COL_CORAL = vec3(1.0, 0.42, 0.36);
const vec3 COL_WHITE = vec3(0.95, 0.99, 1.0);

vec2 rotate2d(vec2 value, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(value.x * c - value.y * s, value.x * s + value.y * c);
}

void main() {
  vec3 pos = position;
  float centeredProgress = aProgress - 0.5;
  float angle = aProgress * DNA_TURNS * TAU + (aSide < 0.0 ? 3.14159265 : 0.0);
  vec2 strandDirection = vec2(cos(angle), sin(angle));
  pos.y *= uHeightScale;
  pos.xz = rotate2d(pos.xz, uTwist * centeredProgress * 1.4);
  pos.xz *= uRadiusScale;

  float replicationDistance = abs(aProgress - uReplicationOrigin);
  float replicationRange = max(uReplicationOrigin, 1.0 - uReplicationOrigin);
  float replicationFront = min(1.12, uReplicationAge / 2.2) * replicationRange;
  float replicationOpen = 1.0 - smoothstep(
    replicationFront - 0.035,
    replicationFront + 0.045,
    replicationDistance
  );
  replicationOpen *= uReplicationStrength;
  float replicationWave = exp(
    -pow(replicationDistance - replicationFront, 2.0) / 0.0014
  ) * uReplicationStrength;

  float unzipEnvelope = 0.35 + pow(max(0.0, sin(aProgress * 3.14159265)), 0.7) * 0.65;
  float unzipAmount = uUnzip * unzipEnvelope + replicationOpen * 1.25;
  pos.xz += strandDirection * unzipAmount * 0.84;

  float scanDistance = abs(aProgress - uScanProgress);
  float scanFront = uScanAge * 0.72;
  float scanWave = exp(-pow(scanDistance - scanFront, 2.0) / 0.0012) *
    uScanStrength * exp(-uScanAge * 0.45);
  float interaction = max(scanWave, replicationWave);
  pos.xz += strandDirection * interaction * 0.16;

  if (aPairClass < 0.5) vColor = mix(COL_GOLD, COL_CORAL, clamp(0.5 - aSide * 0.36, 0.0, 1.0));
  else vColor = mix(COL_CYAN, COL_VIOLET, clamp(0.5 - aSide * 0.36, 0.0, 1.0));
  vColor = mix(vColor, COL_WHITE, clamp(interaction * 0.78 + uCoreStrength * 0.2, 0.0, 1.0));
  vAlpha = (0.42 + uCoreStrength * 0.22) * (1.0 - uUnzip * 0.72) *
    (1.0 - replicationOpen * 0.84) + interaction * 0.62;
  vGlow = interaction + uCoreStrength * 0.25;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
