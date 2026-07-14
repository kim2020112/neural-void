attribute vec4 aPosition4d;
attribute float aRole;
attribute float aAxis;
attribute float aSeed;
attribute float aSize;
attribute float aVertexA;
attribute float aVertexB;
attribute float aEdgeProgress;

uniform float uTime;
uniform float uPixelRatio;
uniform float uAngleXW;
uniform float uAngleYW;
uniform float uWScale;
uniform float uExpansionStrength;
uniform float uExpansionAge;
uniform float uSelectedVertex;
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
const float EXTENT = 1.62;
const float PROJECTION_DISTANCE = 4.4;
const vec3 ICE_BLUE = vec3(0.38, 0.82, 1.0);
const vec3 EDGE_WHITE = vec3(0.78, 0.94, 1.0);
const vec3 NODE_WHITE = vec3(0.98, 1.0, 1.0);
const vec3 DIMENSION_ORANGE = vec3(1.0, 0.48, 0.18);

float saturate(float value) {
  return clamp(value, 0.0, 1.0);
}

vec3 shardDirection(float seed) {
  vec3 direction = vec3(
    sin(seed * 91.7 + 0.4),
    cos(seed * 67.3 + 1.2),
    sin(seed * 47.9 + 2.8)
  );
  return normalize(direction + vec3(0.001));
}

void main() {
  bool isEdge = aRole < 0.5;
  bool isVertex = aRole > 0.5 && aRole < 1.5;
  bool isDust = aRole > 1.5;
  vec4 point4d = aPosition4d;
  point4d.w *= uWScale;

  float cosXW = cos(uAngleXW);
  float sinXW = sin(uAngleXW);
  float rotatedX = point4d.x * cosXW - point4d.w * sinXW;
  float rotatedW = point4d.x * sinXW + point4d.w * cosXW;
  point4d.x = rotatedX;
  point4d.w = rotatedW;

  float cosYW = cos(uAngleYW);
  float sinYW = sin(uAngleYW);
  float rotatedY = point4d.y * cosYW - point4d.w * sinYW;
  rotatedW = point4d.y * sinYW + point4d.w * cosYW;
  point4d.y = rotatedY;
  point4d.w = rotatedW;

  float perspective = PROJECTION_DISTANCE / max(1.35, PROJECTION_DISTANCE - point4d.w);
  vec3 pos = point4d.xyz * perspective * EXTENT;

  if (isDust) {
    float dustPhase = uTime * (0.12 + aSeed * 0.08) + aSeed * TAU;
    pos += vec3(sin(dustPhase), cos(dustPhase * 0.83), sin(dustPhase * 0.61)) * 0.045;
  }

  float expansionProgress = clamp(uExpansionAge / 1.1, 0.0, 1.0);
  float expansionPulse = sin(expansionProgress * PI) *
    (1.0 - smoothstep(0.96, 1.0, expansionProgress)) * uExpansionStrength;
  pos *= 1.0 + expansionPulse * (isDust ? 0.26 : 0.15);

  float connectedToSelection = 0.0;
  float distanceFromSelection = 1.0;
  if (uSelectedVertex > -0.5 && isEdge) {
    float startsAtSelection = 1.0 - step(0.45, abs(aVertexA - uSelectedVertex));
    float endsAtSelection = 1.0 - step(0.45, abs(aVertexB - uSelectedVertex));
    connectedToSelection = max(startsAtSelection, endsAtSelection);
    distanceFromSelection = mix(1.0 - aEdgeProgress, aEdgeProgress, startsAtSelection);
  }
  float pointFront = clamp(uPointAge / 1.4, 0.0, 1.15);
  float pointWave = exp(-pow(distanceFromSelection - pointFront, 2.0) / 0.0065) *
    connectedToSelection * uPointStrength;
  float selectedNode = isVertex && abs(aVertexA - uSelectedVertex) < 0.45
    ? uPointStrength
    : 0.0;
  pos *= 1.0 + pointWave * 0.028 + selectedNode * 0.018;

  pos *= 1.0 - uCoreStrength * (isDust ? 0.84 : 0.7);
  float fractureIn = smoothstep(0.0, 0.45, uExplosionAge);
  float reconstruction = smoothstep(0.45, 2.4, uExplosionAge);
  float fracture = fractureIn * (1.0 - reconstruction) * uExplosionStrength;
  float shardScale = isVertex ? 2.65 : isDust ? 3.5 : 2.2;
  pos += shardDirection(aSeed) * fracture * shardScale * (0.72 + aSeed * 0.5);
  if (isEdge) {
    pos += normalize(pos + vec3(0.001)) * sin(aEdgeProgress * PI) * fracture * 0.34;
  }

  bool isFourthAxis = isEdge && aAxis > 2.5 && aAxis < 3.5;
  vColor = isDust ? mix(ICE_BLUE, EDGE_WHITE, 0.12) : isVertex ? NODE_WHITE : ICE_BLUE;
  if (isFourthAxis) vColor = mix(vColor, DIMENSION_ORANGE, 0.72);
  vColor = mix(vColor, NODE_WHITE, pointWave * 0.7);
  vColor = mix(vColor, DIMENSION_ORANGE, selectedNode * 0.78);
  vColor = mix(vColor, NODE_WHITE, uCoreStrength * 0.52 + fracture * 0.22);

  float flicker = 0.92 + sin(uTime * (0.8 + aSeed * 1.6) + aSeed * 37.0) * 0.08;
  float roleBrightness = isVertex ? 1.52 : isDust ? 0.34 : isFourthAxis ? 1.18 : 0.82;
  vBrightness = roleBrightness * flicker *
    (1.0 + pointWave * 1.25 + selectedNode * 1.6 + uCoreStrength * 0.72 + fracture * 0.55);
  vAlpha = isDust ? 0.24 : isVertex ? 0.96 : 0.78;
  vAlpha *= 0.92 + expansionPulse * 0.08;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float viewDistance = max(0.5, -mvPosition.z);
  float roleScale = isVertex ? 1.38 : isDust ? 0.72 : 1.0;
  roleScale *= 1.0 + pointWave * 0.72 + selectedNode * 1.08 + uCoreStrength * 0.18;
  gl_PointSize = clamp(aSize * roleScale * uPixelRatio * (170.0 / viewDistance), 0.38, 8.8);

  vRole = aRole;
}
