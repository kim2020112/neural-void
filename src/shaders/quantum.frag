varying float vAlpha;
varying float vBrightness;
varying float vRole;
varying vec3 vColor;

void main() {
  float distanceFromCenter = length(gl_PointCoord - 0.5) * 2.0;
  if (distanceFromCenter > 1.0) discard;
  float d2 = distanceFromCenter * distanceFromCenter;
  float core = exp(-d2 * 40.0);
  float glow = exp(-d2 * 8.0) * 0.38;
  float halo = exp(-distanceFromCenter * 3.2) * 0.06;
  float alpha = (core + glow + halo) * vAlpha;
  if (alpha < 0.006) discard;
  float roleBoost = vRole < 0.5 ? 1.16 : vRole > 3.5 ? 0.86 : 1.0;
  vec3 color = vColor * (core * 1.82 + glow * 0.92 + halo * 0.34) * vBrightness * roleBoost;
  gl_FragColor = vec4(color, alpha);
}
