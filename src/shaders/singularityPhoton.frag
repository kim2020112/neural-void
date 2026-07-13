uniform float uTime;
uniform float uIntensity;
uniform float uExplosionStrength;
uniform float uExplosionAge;

varying vec2 vUv;

void main() {
  float tube = pow(max(0.0, sin(vUv.y * 3.14159265)), 1.8);
  float streamA = pow(0.5 + 0.5 * sin(vUv.x * 58.0 - uTime * 4.2), 18.0);
  float streamB = pow(0.5 + 0.5 * sin(vUv.x * 131.0 + uTime * 2.7), 38.0);
  float flash = uExplosionStrength * exp(-uExplosionAge * 2.4);
  float energy = (0.34 + streamA * 0.72 + streamB * 0.38) * tube;
  vec3 color = mix(vec3(1.0, 0.38, 0.04), vec3(1.0, 0.96, 0.76), streamA * 0.62 + flash * 0.6);
  color *= energy * (1.45 + uIntensity * 0.7 + flash * 3.2);
  float alpha = energy * (0.58 + uIntensity * 0.18 + flash * 0.34);
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(color, alpha);
}
