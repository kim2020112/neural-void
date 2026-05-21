varying vec3 vColor;
varying float vAlpha;
varying float vForceIntensity;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;

  // ── Multi-layer isotropic glow ──────────────────────────
  // Spike: ultra-tight piercing hot core
  float spike = exp(-d * 10.0) * 1.6;
  // Core: tight bright center
  float core  = exp(-d * 4.5) * 0.7;
  // Glow: medium soft halo
  float glow  = exp(-d * 1.8) * 0.4;
  // Halo: wide feathered aura
  float halo  = exp(-d * 0.7) * 0.15;
  // Feather: ultra-soft outer edge
  float feather = exp(-d * 0.22) * 0.05;

  float alpha = spike + core + glow + halo + feather;

  // Discard near-transparent fragments
  if (alpha < 0.015) discard;

  // Composite color with layer weights
  vec3 color = vColor * (spike * 1.0 + core * 0.8 + glow * 0.5 + halo * 0.25 + feather * 0.1);

  // Extra bloom contribution on the glow layer
  color += vColor * glow * 0.35;

  // ── Force-induced warm shift ─────────────────────────────
  // At rest: preserve the ice-blue → gold palette
  // Under force: shift toward blazing warm white
  vec3 warmColor = mix(vColor, vColor * vec3(1.15, 0.75, 0.55), vForceIntensity);
  // Hot core spike bleaches to pure white under force
  float spikeWhiteness = spike * vForceIntensity * 0.6;
  color = mix(color, warmColor, vForceIntensity * 0.7);

  // ── HDR output: push active particles beyond 1.0 ─────────
  // Bloom post-processing catches values >1.0 for cinematic glow
  float hdrBoost = 1.0 + vForceIntensity * 4.5;
  color *= hdrBoost;

  // Add white-hot spike at center of force-active particles
  color += vec3(1.0, 1.0, 0.95) * spikeWhiteness * hdrBoost;

  gl_FragColor = vec4(color, alpha * vAlpha);
}
