varying vec3 vColor;
varying float vAlpha;

void main() {
  // Soft circular particle
  float d = length(gl_PointCoord - 0.5) * 2.0;

  // Multi-layer glow: tight core + soft halo
  float core = exp(-d * 3.5) * 0.9;
  float glow = exp(-d * 1.2) * 0.35;
  float outer = exp(-d * 0.5) * 0.1;

  float alpha = core + glow + outer;

  // Discard nearly-transparent fragments for performance
  if (alpha < 0.02) discard;

  vec3 color = vColor * (core * 1.0 + glow * 0.6 + outer * 0.3);
  color += vColor * 0.2 * glow; // extra bloom boost

  gl_FragColor = vec4(color, alpha * vAlpha);
}
