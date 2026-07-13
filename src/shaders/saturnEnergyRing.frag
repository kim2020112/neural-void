uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uFlowSpeed;
uniform float uArc;
uniform float uPhase;
uniform float uGesture;
uniform float uWave;
uniform float uPointAngle;
uniform float uPointStrength;

varying vec2 vUv;

float angleDistance(float a, float b) {
  return abs(atan(sin(a - b), cos(a - b)));
}

void main() {
  float theta = vUv.x * uArc;
  float tubeCore = pow(max(0.0, sin(vUv.y * 3.14159265)), 1.7);

  float flowA = pow(0.5 + 0.5 * sin(theta * 18.0 - uTime * uFlowSpeed * 5.2 + uPhase * 7.0), 24.0);
  float flowB = pow(0.5 + 0.5 * sin(theta * 43.0 + uTime * uFlowSpeed * 3.1 - uPhase * 11.0), 42.0);
  float anchor = pow(0.5 + 0.5 * sin(theta * 2.0 - uTime * 0.42 + uPhase), 12.0);
  float wave = pow(0.5 + 0.5 * sin(theta * 3.0 - uTime * 3.2), 8.0) * uWave;
  float point = exp(-pow(angleDistance(theta, uPointAngle), 2.0) / 0.07) * uPointStrength;

  float energy = 0.16 + flowA * 0.72 + flowB * 0.38 + anchor * 0.24;
  energy += wave * 0.85 + point * 1.2;
  energy *= 1.0 + uGesture * 0.52;
  energy *= tubeCore;

  vec3 pale = mix(uColor, vec3(1.0, 0.96, 0.8), flowA * 0.48 + wave * 0.35);
  pale = mix(pale, vec3(1.0), clamp(point * 0.65 + flowB * 0.18, 0.0, 0.8));
  float hdr = 1.55 + flowA * 1.15 + wave * 0.9 + point * 1.45 + uGesture * 0.55;
  vec3 color = pale * energy * hdr;
  float alpha = energy * uOpacity;
  if (alpha < 0.008) discard;

  gl_FragColor = vec4(color, alpha);
}
