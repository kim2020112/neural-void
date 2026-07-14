varying float vAlpha;
varying float vBrightness;
varying float vDust;
varying vec3 vColor;

void main() {
  float distanceFromCenter = length(gl_PointCoord - 0.5) * 2.0;
  if (distanceFromCenter > 1.0) discard;
  float d2 = distanceFromCenter * distanceFromCenter;
  if (vDust > 0.5) {
    float dustAlpha = smoothstep(1.0, 0.18, distanceFromCenter) * vAlpha;
    if (dustAlpha < 0.025) discard;
    gl_FragColor = vec4(vColor, dustAlpha * 0.72);
    return;
  }
  float core = exp(-d2 * 42.0);
  float glow = exp(-d2 * 9.0) * 0.34;
  float halo = exp(-distanceFromCenter * 3.5) * 0.045;
  float alpha = (core + glow + halo) * vAlpha;
  if (alpha < 0.005) discard;
  vec3 color = vColor * (core * 1.88 + glow * 0.9 + halo * 0.28) * vBrightness;
  gl_FragColor = vec4(color, alpha);
}
