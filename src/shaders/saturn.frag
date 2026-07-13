varying float vType;
varying float vBrightness;
varying float vAlpha;
varying float vFrontRing;
varying float vLane;
varying float vGestureGlow;
varying vec3 vColor;

void main() {
  float distanceFromCenter = length(gl_PointCoord - 0.5) * 2.0;
  if (distanceFromCenter > 1.0) discard;

  float d2 = distanceFromCenter * distanceFromCenter;
  float core = exp(-d2 * 32.0);
  float midGlow = exp(-d2 * 11.0) * 0.34;
  float outerGlow = exp(-d2 * 4.2) * 0.1;
  float softHalo = exp(-distanceFromCenter * 2.2) * 0.025;
  float alpha = core * 0.98 + midGlow + outerGlow + softHalo;
  if (alpha < 0.008) discard;

  vec3 color = vColor * 1.72 * core;
  color += vColor * 0.82 * midGlow;
  color += vColor * 0.3 * (outerGlow + softHalo);
  float hdr = 0.5;

  if (vType < 0.5) {
    hdr = 1.05 + vBrightness * 0.62;
    color = mix(color, vec3(0.92, 0.98, 1.0), core * 0.66);
  } else if (vType < 1.5) {
    hdr = 0.38 + vBrightness * 0.31;
    color = mix(color, vec3(0.68, 0.9, 1.0), core * 0.22);
  } else if (vType < 2.5) {
    bool mainRing = vLane > 1.5 && vLane < 2.5;
    bool outerRing = vLane > 2.5;
    if (mainRing) {
      hdr = 0.7 + vBrightness * 0.6 + vFrontRing * 0.2;
      color = mix(color, vec3(1.0, 0.94, 0.72), core * 0.5);
    } else if (outerRing) {
      hdr = 0.31 + vBrightness * 0.3;
    } else if (vLane < 0.5) {
      hdr = 0.53 + vBrightness * 0.46 + vFrontRing * 0.12;
      color = mix(color, vec3(0.82, 0.94, 1.0), core * 0.16);
    } else {
      hdr = 0.48 + vBrightness * 0.4 + vFrontRing * 0.1;
    }
  } else if (vType < 3.5) {
    hdr = 0.3 + vBrightness * 0.34;
    if (vBrightness > 0.7) hdr *= 1.28;
  } else {
    hdr = 1.85 + vBrightness * 0.82;
    color = mix(color, vec3(1.0, 0.98, 0.92), core * 0.84);
  }

  if (vType > 1.5) hdr *= mix(0.48, 1.3, vFrontRing);
  if (vGestureGlow > 0.01) {
    hdr *= 1.0 + vGestureGlow * 1.05;
    color = mix(color, vec3(1.0, 0.96, 0.78), clamp(vGestureGlow * 0.5, 0.0, 0.76));
  }

  color *= hdr;
  float finalAlpha = alpha * vAlpha * (0.62 + core * 0.46);
  gl_FragColor = vec4(color, finalAlpha);
}
