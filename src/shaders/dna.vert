attribute vec3 aBasePosition;
attribute float aType;
attribute float aSeed;
attribute float aSize;
attribute float aBrightness;
attribute float aProgress;
attribute float aPairClass;
attribute float aSide;

uniform float uTime;
uniform float uPixelRatio;
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
uniform float uBreath;

varying float vType;
varying float vAlpha;
varying float vBrightness;
varying float vInteraction;
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

float saturate(float value) {
  return clamp(value, 0.0, 1.0);
}

void main() {
  float typeId = aType;
  bool isBackboneA = typeId < 0.5;
  bool isBackboneB = typeId > 0.5 && typeId < 1.5;
  bool isBase = typeId > 1.5 && typeId < 2.5;
  bool isMarker = typeId > 2.5 && typeId < 3.5;
  bool isReplica = typeId > 3.5;
  vec3 pos = aBasePosition;
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
  if (!isReplica) {
    pos.xz += strandDirection * unzipAmount * (isBase ? 0.84 : 1.08);
  }

  float replicaVisibility = isReplica ? replicationOpen : 1.0;
  if (isReplica) {
    pos.x += aSide * (1.15 + replicationOpen * 1.7);
    pos.xz += strandDirection * replicationOpen * 0.48;
    pos.y += sin(aProgress * TAU * 2.0 + aSeed * TAU) * replicationOpen * 0.08;
  }

  float scanDistance = abs(aProgress - uScanProgress);
  float scanFront = uScanAge * 0.72;
  float scanWave = exp(-pow(scanDistance - scanFront, 2.0) / 0.0012) *
    uScanStrength * exp(-uScanAge * 0.45);
  float scanLock = exp(-scanDistance * scanDistance / 0.00075) * uScanStrength *
    exp(-uScanAge * 1.8);
  float interaction = max(replicationWave, max(scanWave, scanLock));
  pos.xz += strandDirection * (scanWave * 0.18 + replicationWave * 0.26);
  pos.y += sin(aSeed * 31.0 + uTime * 5.0) * interaction * 0.08;

  float idleFlow = sin(uTime * 1.15 - aProgress * 32.0 + aSeed * TAU) * 0.5 + 0.5;
  if (isMarker) {
    pos.xz *= 1.0 + idleFlow * 0.012 + uCoreStrength * 0.018;
  }

  if (isBackboneA) vColor = COL_CYAN;
  else if (isBackboneB) vColor = COL_VIOLET;
  else if (aPairClass < 0.5) vColor = mix(COL_GOLD, COL_CORAL, saturate(0.5 - aSide * 0.36));
  else vColor = mix(COL_CYAN, COL_VIOLET, saturate(0.5 - aSide * 0.36));
  if (isMarker) vColor = mix(vColor, COL_WHITE, 0.58);
  if (isReplica) {
    vec3 strandColor = aSide > 0.0 ? COL_CYAN : COL_VIOLET;
    vColor = mix(strandColor, COL_WHITE, 0.58 + replicationWave * 0.25);
  }
  vColor = mix(vColor, COL_WHITE, saturate(interaction * 0.72 + uCoreStrength * 0.18));

  float flicker = 0.9 + 0.1 * sin(uTime * (1.2 + aSeed * 2.8) + aSeed * 41.0);
  float bright = aBrightness * flicker;
  bright *= 1.0 + idleFlow * (isMarker ? 0.3 : 0.08);
  bright *= 1.0 + interaction * 1.35 + uCoreStrength * (isBase ? 0.28 : 0.42);

  float alpha = 0.88 + uBreath * 0.08;
  if (isBase) alpha *= 1.0 - uUnzip * 0.42;
  if (isReplica) alpha *= replicaVisibility * (0.78 + replicationWave * 0.22);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float viewDistance = max(0.5, -mvPosition.z);
  float typeScale = isBase ? 0.82 : isMarker ? 1.38 : isReplica ? 0.92 : 1.08;
  typeScale *= 1.0 + interaction * 0.4 + uCoreStrength * 0.08;
  gl_PointSize = clamp(aSize * typeScale * uPixelRatio * (170.0 / viewDistance), 0.32, 7.4);

  vType = typeId;
  vAlpha = alpha;
  vBrightness = bright;
  vInteraction = interaction;
}
