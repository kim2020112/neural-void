attribute float aScale;
attribute float aLayer;
attribute float aRandom;

uniform float uTime;
uniform float uPulse;
uniform float uEnergy;
uniform float uTurbulence;

varying float vAlpha;
varying vec3 vColor;

void main() {
  vec3 pos = position;

  float phase = uTime * mix(0.035, 0.14, aLayer) + aRandom * 6.28318;
  float swayX = sin(phase + position.z * 0.03) * (0.5 + aLayer * 1.8) * (0.35 + uTurbulence * 0.25);
  float swayY = cos(phase * 1.2 + position.x * 0.025) * (0.25 + aLayer * 0.8) * (0.35 + uPulse * 0.2);
  float swayZ = sin(phase * 0.7 + position.y * 0.02) * (0.4 + aLayer * 1.1) * (0.25 + uEnergy * 0.25);

  pos.x += swayX;
  pos.y += swayY;
  pos.z += swayZ;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float viewDepth = clamp((-mvPosition.z - 8.0) / 60.0, 0.0, 1.0);
  gl_PointSize = aScale * mix(5.8, 1.5, viewDepth) * (160.0 / -mvPosition.z);

  float density = mix(0.055, 0.2, aLayer);
  vAlpha = density * (0.5 + uPulse * 0.25) * smoothstep(0.0, 0.9, viewDepth);

  vec3 deepSpace = vec3(0.07, 0.10, 0.16);
  vec3 hologram = vec3(0.20, 0.72, 0.95);
  vec3 goldDust = vec3(1.0, 0.74, 0.20);
  vColor = mix(deepSpace, hologram, 0.45 + aLayer * 0.35);
  vColor = mix(vColor, goldDust, aLayer * 0.18 + uEnergy * 0.1);
}
