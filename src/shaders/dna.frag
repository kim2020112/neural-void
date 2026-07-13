varying float vType;
varying float vAlpha;
varying float vBrightness;
varying float vInteraction;
varying vec3 vColor;

void main() {
  float distanceFromCenter = length(gl_PointCoord - 0.5) * 2.0;
  if (distanceFromCenter > 1.0) discard;

  float d2 = distanceFromCenter * distanceFromCenter;
  float core = exp(-d2 * 34.0);
  float glow = exp(-d2 * 8.0) * 0.34;
  float halo = exp(-distanceFromCenter * 2.65) * 0.06;
  float alpha = (core + glow + halo) * vAlpha;
  if (alpha < 0.008) discard;

  float hdr = 0.52 + vBrightness * 0.55;
  if (vType > 2.5 && vType < 3.5) hdr *= 1.28;
  if (vType > 3.5) hdr *= 1.12;
  hdr *= 1.0 + vInteraction * 0.72;
  vec3 color = vColor * (core * 1.75 + glow * 0.9 + halo * 0.28) * hdr;
  gl_FragColor = vec4(color, alpha * (0.72 + core * 0.38));
}
