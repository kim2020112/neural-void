varying float vType;
varying float vBrightness;
varying float vAlpha;
varying float vHeat;
varying float vInteraction;
varying vec3 vColor;

void main() {
  float distanceFromCenter = length(gl_PointCoord - 0.5) * 2.0;
  if (distanceFromCenter > 1.0) discard;

  float d2 = distanceFromCenter * distanceFromCenter;
  float core = exp(-d2 * 34.0);
  float glow = exp(-d2 * 8.5) * 0.32;
  float halo = exp(-distanceFromCenter * 2.7) * 0.055;
  float alpha = (core + glow + halo) * vAlpha;
  if (alpha < 0.008) discard;

  float hdr = 0.42 + vBrightness * 0.52;
  if (vType > 0.5 && vType < 1.5) hdr = 1.12 + vBrightness * 0.82;
  if (vType > 1.5 && vType < 2.5) hdr = 0.24 + vBrightness * 0.25;
  if (vType > 2.5) hdr = 0.62 + vBrightness * 0.6;
  hdr *= 1.0 + vInteraction * 0.62;

  vec3 color = vColor * (core * 1.8 + glow * 0.85 + halo * 0.28) * hdr;
  if (vHeat > 0.72) color = mix(color, vec3(1.0, 0.92, 0.7) * hdr, core * (vHeat - 0.72));
  gl_FragColor = vec4(color, alpha * (0.7 + core * 0.42));
}
