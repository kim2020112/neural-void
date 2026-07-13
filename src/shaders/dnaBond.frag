varying float vAlpha;
varying float vGlow;
varying vec3 vColor;

void main() {
  float alpha = clamp(vAlpha, 0.0, 1.0);
  if (alpha < 0.008) discard;
  vec3 color = vColor * (0.72 + vGlow * 1.45);
  gl_FragColor = vec4(color, alpha);
}
