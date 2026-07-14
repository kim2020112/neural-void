varying float vAlpha;
varying float vBrightness;
varying float vRole;
varying vec3 vColor;

void main() {
  float distanceFromCenter = length(gl_PointCoord - 0.5) * 2.0;
  if (distanceFromCenter > 1.0) discard;
  float d2 = distanceFromCenter * distanceFromCenter;
  float core = exp(-d2 * 42.0);
  float glow = exp(-d2 * 9.0) * 0.36;
  float halo = exp(-distanceFromCenter * 3.4) * 0.05;
  float alpha = (core + glow + halo) * vAlpha;
  if (alpha < 0.006) discard;
  float roleBoost = vRole > 0.5 ? 1.18 : 0.92;
  vec3 color = vColor * (core * 1.86 + glow * 0.9 + halo * 0.3) * vBrightness * roleBoost;
  gl_FragColor = vec4(color, alpha);
}
