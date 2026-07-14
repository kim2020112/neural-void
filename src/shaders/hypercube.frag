varying float vAlpha;
varying float vBrightness;
varying float vRole;
varying vec3 vColor;

void main() {
  float distanceFromCenter = length(gl_PointCoord - 0.5) * 2.0;
  if (distanceFromCenter > 1.0) discard;

  float d2 = distanceFromCenter * distanceFromCenter;
  float core = exp(-d2 * 38.0);
  float glow = exp(-d2 * 9.0) * 0.34;
  float halo = exp(-distanceFromCenter * 3.0) * 0.055;
  float alpha = (core + glow + halo) * vAlpha;
  if (alpha < 0.006) discard;

  float roleBoost = vRole > 0.5 && vRole < 1.5 ? 1.2 : vRole > 1.5 ? 0.54 : 0.86;
  vec3 color = vColor * (core * 1.82 + glow * 0.94 + halo * 0.3) *
    vBrightness * roleBoost;
  gl_FragColor = vec4(color, alpha * (0.74 + core * 0.32));
}
