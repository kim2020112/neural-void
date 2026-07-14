varying float vAlpha;
varying float vBrightness;
varying float vRole;
varying vec3 vColor;

void main() {
  float distanceFromCenter = length(gl_PointCoord - 0.5) * 2.0;
  if (distanceFromCenter > 1.0) discard;
  float d2 = distanceFromCenter * distanceFromCenter;
  float core = exp(-d2 * 40.0);
  float glow = exp(-d2 * 8.5) * 0.36;
  float halo = exp(-distanceFromCenter * 3.25) * 0.052;
  float alpha = (core + glow + halo) * vAlpha;
  if (alpha < 0.006) discard;
  float roleBoost = vRole < 0.5 ? 1.18 : vRole > 1.5 && vRole < 2.5 ? 1.12 : 0.96;
  vec3 color = vColor * (core * 1.84 + glow * 0.91 + halo * 0.31) * vBrightness * roleBoost;
  gl_FragColor = vec4(color, alpha);
}
