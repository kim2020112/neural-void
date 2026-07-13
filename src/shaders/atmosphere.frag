varying float vAlpha;
varying vec3 vColor;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float core = exp(-d * 4.0);
  float glow = exp(-d * 1.5) * 0.55;
  float feather = exp(-d * 0.45) * 0.15;

  float alpha = (core + glow + feather) * vAlpha;
  if (alpha < 0.01) discard;

  vec3 color = vColor * (core * 0.9 + glow * 0.6 + feather * 0.25);
  gl_FragColor = vec4(color, alpha);
}
