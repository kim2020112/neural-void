uniform float uTime;
uniform float uBreath;
uniform float uCoreBoost;
uniform float uReleasePulse;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;

float saturate(float value) {
  return clamp(value, 0.0, 1.0);
}

void main() {
  vec3 normalDirection = normalize(vNormal);
  vec3 viewDirection = normalize(vViewDir);
  vec3 lightDirection = normalize(vec3(-0.2, 0.62, 0.76));
  float diffuse = saturate(dot(normalDirection, lightDirection) * 0.58 + 0.42);
  float fresnel = pow(1.0 - saturate(dot(normalDirection, viewDirection)), 2.65);
  float latitude = vWorldPos.y * 2.4;
  float bands = 0.5 + 0.5 * sin(latitude * 8.5 + uTime * 0.18);
  bands += 0.22 * sin(latitude * 20.0 - uTime * 0.11);
  bands = saturate(bands * 0.72);

  vec3 abyss = vec3(0.004, 0.025, 0.072);
  vec3 deep = vec3(0.012, 0.13, 0.3);
  vec3 cyan = vec3(0.07, 0.58, 1.0);
  vec3 ice = vec3(0.84, 0.97, 1.0);
  float polar = smoothstep(0.48, 0.92, abs(normalDirection.y));
  vec3 color = mix(abyss, deep, diffuse * 0.68);
  color += cyan * bands * (0.055 + uBreath * 0.025) * (1.0 - polar * 0.35);
  color += cyan * fresnel * (0.24 + uCoreBoost * 0.28 + uReleasePulse * 0.2);
  color += ice * fresnel * fresnel * 0.12;

  float energyCore = pow(diffuse, 8.0) *
    (0.1 + uBreath * 0.08 + uCoreBoost * 0.3 + uReleasePulse * 0.28);
  float auroraBand = smoothstep(0.55, 0.73, abs(normalDirection.y)) *
    (1.0 - smoothstep(0.73, 0.94, abs(normalDirection.y)));
  float auroraWave = sin(atan(normalDirection.z, normalDirection.x) * 8.0 + uTime * 0.5) * 0.5 + 0.5;
  color += mix(cyan, ice, auroraWave) * auroraBand *
    (0.08 + uCoreBoost * 0.14) * fresnel;
  color = mix(color, ice, energyCore);

  float alpha = 0.28 + diffuse * 0.2 + fresnel * 0.34 + energyCore * 0.2;
  gl_FragColor = vec4(color, clamp(alpha, 0.24, 0.64));
}
