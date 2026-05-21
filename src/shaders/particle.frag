varying vec3 vColor;
varying float vAlpha;
varying float vForceIntensity;
varying float vPulseGlow;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;

  float spike = exp(-d * 16.0) * (1.18 + vPulseGlow * 0.14);
  float core = exp(-d * 7.2) * 0.84;
  float glow = exp(-d * 2.7) * (0.2 + vPulseGlow * 0.08);
  float halo = exp(-d * 1.25) * (0.06 + vPulseGlow * 0.04);

  float alpha = spike + core + glow + halo;
  if (alpha < 0.02) discard;

  vec3 color = vColor * (spike * 0.9 + core * 0.78 + glow * 0.22 + halo * 0.08);
  color += vColor * glow * (0.14 + vPulseGlow * 0.08);

  vec3 warmColor = mix(vColor, vColor * vec3(1.05, 0.93, 0.82), vForceIntensity);
  float spikeWhiteness = spike * (vForceIntensity * 0.18 + vPulseGlow * 0.05);
  color = mix(color, warmColor, vForceIntensity * 0.28 + vPulseGlow * 0.02);

  float hdrBoost = 0.62 + vForceIntensity * 0.94 + vPulseGlow * 0.32;
  color *= hdrBoost;
  color += vec3(1.0, 0.99, 0.94) * spikeWhiteness * hdrBoost * 0.32;

  float finalAlpha = alpha * vAlpha * (0.72 + vPulseGlow * 0.1);
  gl_FragColor = vec4(color, finalAlpha);
}