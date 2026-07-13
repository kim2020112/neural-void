attribute float aSize;
attribute vec3 aColor;
attribute vec3 aTargetPosition;
attribute float aRandom;

varying vec3 vColor;
varying float vAlpha;
varying float vForceIntensity;
varying float vPulseGlow;

uniform float uTime;
uniform float uPixelRatio;
uniform vec2 uMouse;
uniform float uParticleCount;
uniform vec3 uHandPos;
uniform vec3 uHand2Pos;
uniform float uForceType;
uniform float uForceStrength;
uniform vec3 uFingertipPos;
uniform vec3 uVoidCenter;
uniform float uVoidPhase;
uniform float uVoidStrength;
uniform float uVoidExplosionTime;
uniform float uShapeTransition;
uniform float uShapeMode;
uniform float uCinematicPulse;
uniform float uCinematicEnergy;
uniform float uInteractionMode;
uniform float uInteractionPresence;
uniform float uDuality;
uniform float uDepthBias;
uniform float uFlowWeight;
uniform float uMorphTension;
uniform float uGalleryMode;

float saturate(float value) {
  return clamp(value, 0.0, 1.0);
}

vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

vec3 curlNoise(vec3 p, float t) {
  float eps = 0.5;
  float n1 = snoise(p + vec3(eps, 0.0, 0.0) + t * 0.1);
  float n2 = snoise(p + vec3(-eps, 0.0, 0.0) + t * 0.1);
  float n3 = snoise(p + vec3(0.0, eps, 0.0) + t * 0.1);
  float n4 = snoise(p + vec3(0.0, -eps, 0.0) + t * 0.1);
  float n5 = snoise(p + vec3(0.0, 0.0, eps) + t * 0.1);
  float n6 = snoise(p + vec3(0.0, 0.0, -eps) + t * 0.1);

  return vec3(n4 - n3, n6 - n5, n1 - n2) / (2.0 * eps);
}

vec3 distancePalette(float dist, float forceIntensity, vec3 seed, float shapeMode) {
  float t = clamp(dist / 16.0, 0.0, 1.0);

  vec3 zoneA;
  vec3 zoneB;
  vec3 zoneC;
  vec3 zoneD;

  if (shapeMode > 2.5 && shapeMode < 3.5) {
    zoneA = vec3(1.0, 0.95, 0.84);
    zoneB = vec3(1.0, 0.79, 0.33);
    zoneC = vec3(0.82, 0.42, 0.1);
    zoneD = vec3(0.18, 0.08, 0.03);
  } else if (shapeMode < 1.5) {
    zoneA = vec3(0.97, 0.99, 1.0);
    zoneB = vec3(0.56, 0.86, 1.0);
    zoneC = vec3(0.18, 0.56, 1.0);
    zoneD = vec3(0.06, 0.14, 0.46);
  } else if (shapeMode < 2.5) {
    zoneA = vec3(1.0, 0.92, 0.82);
    zoneB = vec3(1.0, 0.64, 0.18);
    zoneC = vec3(0.9, 0.28, 0.82);
    zoneD = vec3(0.22, 0.06, 0.28);
  } else if (shapeMode < 4.5) {
    zoneA = vec3(0.86, 0.98, 1.0);
    zoneB = vec3(0.26, 0.88, 1.0);
    zoneC = vec3(0.9, 0.38, 1.0);
    zoneD = vec3(0.16, 0.08, 0.36);
  } else if (shapeMode < 5.5) {
    zoneA = vec3(1.0, 0.97, 0.86);
    zoneB = vec3(1.0, 0.84, 0.3);
    zoneC = vec3(0.96, 0.56, 0.12);
    zoneD = vec3(0.35, 0.14, 0.03);
  } else if (shapeMode < 6.5) {
    zoneA = vec3(0.92, 0.98, 1.0);
    zoneB = vec3(0.44, 0.7, 1.0);
    zoneC = vec3(0.26, 0.4, 0.98);
    zoneD = vec3(0.08, 0.1, 0.28);
  } else if (shapeMode < 7.5) {
    zoneA = vec3(1.0, 0.96, 0.86);
    zoneB = vec3(0.62, 0.72, 1.0);
    zoneC = vec3(0.22, 0.44, 0.92);
    zoneD = vec3(0.04, 0.05, 0.18);
  } else {
    zoneA = vec3(1.0, 0.98, 0.92);
    zoneB = vec3(1.0, 0.7, 0.24);
    zoneC = vec3(0.92, 0.3, 0.08);
    zoneD = vec3(0.09, 0.03, 0.01);
  }

  float zone1 = 1.0 - smoothstep(0.0, 0.25, t);
  float zone2 = smoothstep(0.15, 0.35, t) * (1.0 - smoothstep(0.45, 0.55, t));
  float zone3 = smoothstep(0.45, 0.60, t) * (1.0 - smoothstep(0.75, 0.85, t));
  float zone4 = smoothstep(0.75, 0.90, t);

  vec3 baseColor = zoneA * zone1 + zoneB * zone2 + zoneC * zone3 + zoneD * zone4;
  vec3 hotShift = mix(baseColor, vec3(1.0, 0.98, 0.92), forceIntensity * 0.5);
  vec3 tint = (seed - 0.5) * 0.08;
  return clamp(hotShift + tint, 0.0, 1.0);
}

vec3 getTangent(vec3 radial) {
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 tangent = normalize(cross(radial, up));
  if (length(tangent) < 0.001) {
    tangent = normalize(cross(radial, vec3(1.0, 0.0, 0.0)));
  }
  return tangent;
}

vec3 attractForce(vec3 pos, vec3 center, float strength) {
  vec3 dir = center - pos;
  float dist = length(dir);
  if (dist < 0.001) return vec3(0.0);

  float capture = exp(-pow(dist - 2.8, 2.0) / 2.8);
  float closePull = exp(-dist * 1.4) * 2.5;
  float longRange = exp(-dist * 0.12) * 0.35;
  float magnitude = strength * (capture * 2.2 + closePull + longRange);
  magnitude *= 1.0 - smoothstep(12.0, 28.0, dist);

  return normalize(dir) * magnitude * 30.0;
}

vec3 repelForce(vec3 pos, vec3 center, float strength) {
  vec3 dir = pos - center;
  float dist = length(dir);
  if (dist < 0.001) return vec3(0.0);

  float pushRing = exp(-pow(dist - 3.5, 2.0) / 2.5);
  float closePush = exp(-dist * 1.0) * 2.8;
  float broad = exp(-dist * 0.25) * 0.3;
  float magnitude = strength * (pushRing * 2.8 + closePush + broad);
  magnitude *= 1.0 - smoothstep(14.0, 32.0, dist);

  return normalize(dir) * magnitude * 28.0;
}

vec3 pointForce(vec3 pos, vec3 tip, float strength) {
  vec3 dir = tip - pos;
  float dist = length(dir);
  if (dist < 0.001) return vec3(0.0);

  float focus = exp(-pow(dist, 2.0) / 2.5);
  float wide = exp(-dist * 0.5) * 0.6;
  float magnitude = strength * (focus * 2.5 + wide);
  magnitude *= 1.0 - smoothstep(8.0, 22.0, dist);

  return normalize(dir) * magnitude * 24.0;
}

vec3 dualOrbitForce(vec3 pos, vec3 left, vec3 right, float strength) {
  vec3 mid = mix(left, right, 0.5);
  vec3 axis = normalize(right - left + vec3(0.001, 0.002, 0.003));
  vec3 toMid = mid - pos;
  float dist = length(toMid);
  if (dist < 0.001) return vec3(0.0);

  vec3 radial = normalize(toMid);
  vec3 tangent = normalize(cross(axis, radial));
  float orbitalBand = exp(-pow(dist - (1.8 + strength * 2.4), 2.0) / (2.2 + strength * 1.6));
  float inward = exp(-dist * 0.18) * 0.18;

  return (tangent * orbitalBand * (0.9 + strength * 1.8) + radial * inward * 0.35) * strength * 18.0;
}

vec3 depthShear(vec3 pos, float depthBias, vec3 center) {
  vec3 radial = normalize(pos - center + vec3(0.001));
  float ribbon = 0.5 + 0.5 * sin(uTime * 1.1 + length(pos) * 0.8 + aRandom * 16.0);
  vec3 zPull = vec3(0.0, 0.0, -1.0 + depthBias * 2.0);
  return mix(radial, zPull, 0.6) * depthBias * ribbon * 4.0;
}

vec3 coreCollapseForce(vec3 pos, vec3 center, float strength) {
  vec3 toCenter = center - pos;
  float dist = length(toCenter);
  if (dist < 0.001) return vec3(0.0);

  vec3 radial = normalize(toCenter);
  float shell = exp(-pow(dist - (1.2 + strength * 1.4), 2.0) / (1.4 + strength * 0.9));
  float sink = exp(-dist * 0.22) * 0.45;
  float compression = smoothstep(7.2, 0.5, dist);

  return radial * (shell * (1.6 + strength * 2.6) + sink) * compression * strength * 26.0;
}

vec3 lensingForce(vec3 pos, vec3 center, float strength) {
  vec3 toCenter = center - pos;
  float dist = length(toCenter);
  vec3 radial = normalize(toCenter);
  vec3 tangent = getTangent(radial);

  float lensMag = strength / (dist * dist + 0.4);
  float ringMask = 1.0 - smoothstep(0.5, 12.0, dist);
  ringMask *= smoothstep(0.2, 1.5, dist);

  return tangent * lensMag * ringMask * 18.0;
}

vec3 vortexForce(vec3 pos, vec3 center, float strength) {
  vec3 toCenter = center - pos;
  float dist = length(toCenter);
  vec3 radial = normalize(toCenter);
  vec3 tangent = getTangent(radial);

  float diskFlatten = 1.0 - smoothstep(1.0, 4.0, dist);
  radial.y *= 1.0 - diskFlatten * 0.8;

  float speed = strength / (dist * dist + 0.15);
  float distMask = 1.0 - smoothstep(8.0, 25.0, dist);
  float horizonPull = smoothstep(1.2, 0.3, dist);
  float horizonBoost = 1.0 + horizonPull * 8.0;

  vec3 spiral = tangent * speed * 4.0 + radial * speed * 0.8;
  return spiral * distMask * horizonBoost * 25.0;
}

vec3 explosionForce(vec3 pos, vec3 center, float strength, float age) {
  vec3 fromCenter = pos - center;
  float dist = length(fromCenter);
  vec3 outward = dist > 0.001 ? normalize(fromCenter) : vec3(0.0, 1.0, 0.0);
  vec3 tangent = getTangent(outward);

  float ringRadius = age * 10.5;
  float ringWidth = 0.85 + age * 0.45;
  float ring = exp(-abs(dist - ringRadius) / ringWidth);
  float radialPush = strength / (dist * dist + 0.8);
  radialPush *= 1.0 - smoothstep(6.5, 32.0, dist);

  float decay = 1.0 - smoothstep(2.2, 4.6, age);
  float fadeIn = smoothstep(0.0, 0.08, age);
  float recoil = smoothstep(0.8, 1.6, age) * (1.0 - smoothstep(2.4, 4.2, age));
  float recoilPull = smoothstep(5.0, 0.45, dist) * recoil * (0.6 + strength * 0.8);
  float shockSpiral = ring * recoil * (0.25 + aRandom * 0.45);

  return (
    outward * ((radialPush * 14.0 + ring * strength * 34.0) * decay * fadeIn - recoilPull * 9.0) +
    tangent * shockSpiral * 12.0
  );
}

vec3 applyShapeLife(vec3 pos) {
  vec3 result = pos;
  float energy = uCinematicEnergy;
  float galleryShapeMotion = mix(1.0, 0.08, uGalleryMode);
  float gallerySecondary = mix(1.0, 0.16, uGalleryMode);

  if (uShapeMode > 2.5 && uShapeMode < 3.5) {
    float radius = length(result.xz) + 0.001;
    float angle = atan(result.z, result.x);

    if (radius < 3.9) {
      float coreNormal = length(result) + 0.001;
      vec3 coreDir = result / coreNormal;
      float corePulse = sin(uTime * 0.78 * gallerySecondary + aRandom * 18.0 + coreNormal * 1.6) * (0.045 + energy * 0.06) * galleryShapeMotion;
      vec3 coreTurbulence = curlNoise(result * 0.22 + aRandom * 5.0, uTime * 0.08 * gallerySecondary) * (0.032 + energy * 0.03) * galleryShapeMotion;
      result += coreDir * corePulse + coreTurbulence;
      result.y *= 0.9;
    } else {
      float lane = smoothstep(4.0, 9.6, radius);
      float ringBias = 1.0 - smoothstep(4.4, 11.8, radius);
      float orbitSpeed = (0.018 + lane * 0.026 + energy * 0.022 + uDuality * 0.02) * gallerySecondary;
      float turbulence = snoise(vec3(result.xz * 0.095, uTime * 0.08 * gallerySecondary + aRandom * 9.0));
      float thickness = (0.012 + lane * 0.032 + energy * 0.032) * galleryShapeMotion;
      float pullToBand = smoothstep(4.2, 6.0, radius) * 0.24;
      radius += turbulence * (0.04 + lane * 0.06) * galleryShapeMotion - pullToBand;
      angle += uTime * orbitSpeed + turbulence * 0.06 * gallerySecondary;
      result.x = cos(angle) * radius;
      result.z = sin(angle) * radius;
      result.y *= 0.24 - lane * 0.08;
      result.y += sin(angle * 2.0 + uTime * (0.22 + lane * 0.08) * gallerySecondary) * thickness;
      result += normalize(vec3(result.x, 0.0, result.z) + vec3(0.001)) * ringBias * turbulence * 0.08 * galleryShapeMotion;
    }
  } else if (uShapeMode < 1.5) {
    float shell = sin(uTime * 1.2 * gallerySecondary + aRandom * 14.0 + length(result) * 0.9) * (0.04 + energy * 0.06) * galleryShapeMotion;
    result += normalize(result + vec3(0.001)) * shell;
  } else if (uShapeMode < 2.5) {
    float torusAngle = atan(result.z, result.x);
    float torusWave = sin(torusAngle * 3.0 + uTime * 0.26 * gallerySecondary + aRandom * 11.0) * (0.028 + energy * 0.04) * galleryShapeMotion;
    result += normalize(result + vec3(0.001)) * torusWave;
    result.y += sin(torusAngle * 2.0 + uTime * 0.32 * gallerySecondary) * 0.06 * galleryShapeMotion;
  } else if (uShapeMode < 4.5) {
    float helixAngle = atan(result.z, result.x);
    float helixRadius = length(result.xz);
    helixAngle += sign(result.x + 0.001) * (0.028 + energy * 0.026) * galleryShapeMotion;
    result.x = cos(helixAngle) * helixRadius;
    result.z = sin(helixAngle) * helixRadius;
    result.y += sin(helixAngle * 2.0 + uTime * 0.42 * gallerySecondary + aRandom * 6.0) * 0.055 * galleryShapeMotion;
  } else if (uShapeMode < 5.5) {
    float spiralAngle = atan(result.z, result.x);
    float spiralRadius = length(result.xz);
    result.x = cos(spiralAngle + spiralRadius * 0.03 * galleryShapeMotion + uTime * 0.024 * gallerySecondary) * spiralRadius;
    result.z = sin(spiralAngle + spiralRadius * 0.03 * galleryShapeMotion + uTime * 0.024 * gallerySecondary) * spiralRadius;
    result.y += sin(spiralRadius * 0.32 + uTime * 0.22 * gallerySecondary) * 0.08 * galleryShapeMotion;
  } else if (uShapeMode < 6.5) {
    float edgePulse = sin((abs(result.x) + abs(result.y) + abs(result.z)) * 1.1 + uTime * 0.22 * gallerySecondary + aRandom * 9.0);
    result += normalize(result + vec3(0.001)) * edgePulse * (0.008 + energy * 0.012) * galleryShapeMotion;
  } else if (uShapeMode < 7.5) {
    float armTwist = atan(result.z, result.x) + uTime * (0.018 + energy * 0.024 + uDuality * 0.016) * gallerySecondary;
    float spiralRad = length(result.xz);
    result.x = cos(armTwist) * spiralRad;
    result.z = sin(armTwist) * spiralRad;
    result.y += sin(spiralRad * 0.18 + uTime * 0.18 * gallerySecondary) * 0.06 * galleryShapeMotion;
  } else if (uShapeMode > 7.5) {
    float diskPull = 1.0 - smoothstep(0.5, 6.5, length(result.xz));
    result.y *= 0.12 + diskPull * 0.18;
    result += curlNoise(result * 0.25 + aRandom * 5.0, uTime * 0.14 * gallerySecondary) * (0.028 + energy * 0.05) * galleryShapeMotion;
  }

  float structuralStability =
    uShapeMode < 1.5
      ? 0.18
      : uShapeMode < 2.5
        ? 0.12
        : uShapeMode < 3.5
          ? 0.015
          : uShapeMode < 4.5
            ? 0.1
            : uShapeMode < 5.5
              ? 0.12
              : uShapeMode < 6.5
                ? 0.04
                : uShapeMode < 7.5
                  ? 0.1
                  : 0.08;
  result += curlNoise(result * 0.2 + aRandom * 7.0, uTime * 0.08 * gallerySecondary) * (0.008 + energy * 0.024) * structuralStability * galleryShapeMotion;
  return result;
}

vec3 applyCoreEnergy(vec3 pos) {
  float dist = length(pos) + 0.001;
  vec3 normal = pos / dist;
  float galleryEnergyMotion = mix(1.0, 0.12, uGalleryMode);
  float pulse = sin(uTime * 0.92 * galleryEnergyMotion + dist * 0.42 + aRandom * 20.0) * (0.016 + uCinematicEnergy * 0.05) * galleryEnergyMotion;
  vec3 turbulence = curlNoise(pos * 0.2 + aRandom * 6.0, uTime * 0.11 * galleryEnergyMotion) * (0.012 + uCinematicEnergy * 0.04) * galleryEnergyMotion;
  return pos + normal * pulse + turbulence;
}

vec3 applyTransitionPath(vec3 from, vec3 to) {
  float t = saturate(uShapeTransition);
  if (t <= 0.001) return from;

  float collapse = smoothstep(0.0, 0.28 + uMorphTension * 0.08, t);
  float energyRise = smoothstep(0.18, 0.56, t);
  float rebirth = smoothstep(0.56, 1.0, t);

  vec3 centerPull = normalize(from + vec3(0.001, 0.002, 0.003)) * (0.4 + aRandom * 1.2);
  vec3 collapsed = mix(from, centerPull, collapse);

  float vortexRadius = mix(length(collapsed), 0.95 + aRandom * 1.6 + uCinematicEnergy * 0.5 + uMorphTension, energyRise);
  float baseAngle = atan(collapsed.z, collapsed.x);
  float swirlAngle = baseAngle + (uTime * (2.2 + uCinematicEnergy * 2.7 + uMorphTension * 2.0) + aRandom * 18.0) * energyRise;
  vec3 vortex = vec3(
    cos(swirlAngle) * vortexRadius,
    mix(collapsed.y, sin(aRandom * 24.0 + uTime * 1.3) * 1.4, energyRise),
    sin(swirlAngle) * vortexRadius
  );

  vec3 guidedTarget = to + curlNoise(to * 0.22 + aRandom * 4.0, uTime * 0.16) * (1.0 - rebirth) * (0.35 + uMorphTension * 0.3);
  return mix(vortex, guidedTarget, rebirth);
}

void main() {
  vec3 sourcePos = applyShapeLife(position);
  vec3 targetPos = applyShapeLife(aTargetPosition);
  vec3 structuralPos = applyTransitionPath(sourcePos, targetPos);
  vec3 energeticPos = applyCoreEnergy(structuralPos);

  float galleryFlow = mix(1.36, 0.16, uGalleryMode);
  vec3 curl1 = curlNoise(energeticPos * 0.42, uTime * 0.16 * galleryFlow);
  vec3 curl2 = curlNoise(energeticPos * 0.18 + 100.0, uTime * 0.24 * galleryFlow);
  vec3 curl3 = curlNoise(energeticPos * 0.08 - 50.0, uTime * 0.12 * galleryFlow);
  vec3 velocity = (curl1 * 0.22 + curl2 * 0.1 + curl3 * 0.05) * galleryFlow;

  float mouseWeight = 0.052 * (1.0 - max(uForceStrength, uVoidStrength) * 0.85) * galleryFlow;
  vec3 mouseInfluence = vec3(uMouse.x * 0.5, uMouse.y * 0.3, uMouse.x * 0.18);
  velocity += mouseInfluence * mouseWeight;

  float lifeBreath = 1.0 + sin(uTime * 1.3 + aRandom * 12.0) * 0.028 * galleryFlow + uCinematicPulse * 0.042 * galleryFlow;
  vec3 naturalFlow = velocity * (0.58 + uCinematicEnergy * 0.34 + uInteractionPresence * 0.16) * lifeBreath * galleryFlow;

  vec3 displaced = energeticPos;

  if (uForceType > 3.5 && uVoidStrength > 0.01) {
    float strength = uVoidStrength * lifeBreath;
    vec3 voidForce = vec3(0.0);

    if (uVoidPhase < 1.5) {
      voidForce = coreCollapseForce(energeticPos, uVoidCenter, strength) + lensingForce(energeticPos, uVoidCenter, strength * 0.55);
    } else if (uVoidPhase < 2.5) {
      voidForce =
        coreCollapseForce(energeticPos, uVoidCenter, strength * 0.45) +
        lensingForce(energeticPos, uVoidCenter, strength * 0.35) +
        vortexForce(energeticPos, uVoidCenter, strength);
    } else {
      float age = uTime - uVoidExplosionTime;
      voidForce = explosionForce(energeticPos, uVoidCenter, strength, age);
    }

    displaced = energeticPos + mix(naturalFlow * 0.06, voidForce, saturate(uVoidStrength * 0.96 + 0.02));

    float forceMag = length(voidForce) * uVoidStrength;
    vForceIntensity = clamp(forceMag * 1.5 + uCinematicEnergy * 0.22, 0.0, 1.0);

    float dist = length(energeticPos - uVoidCenter);
    float dt = clamp(dist / 14.0, 0.0, 1.0);
    vec3 voidWhite = vec3(1.0, 1.0, 1.0);
    vec3 voidIce = vec3(0.0, 0.85, 1.0);
    vec3 voidPurple = vec3(0.45, 0.08, 0.80);
    vec3 voidDark = vec3(0.03, 0.02, 0.15);

    float w0 = 1.0 - smoothstep(0.0, 0.25, dt);
    float w1 = smoothstep(0.15, 0.35, dt) * (1.0 - smoothstep(0.55, 0.65, dt));
    float w2 = smoothstep(0.55, 0.68, dt) * (1.0 - smoothstep(0.85, 0.95, dt));
    float w3 = smoothstep(0.85, 0.95, dt);
    vColor = voidWhite * w0 + voidIce * w1 + voidPurple * w2 + voidDark * w3;

    if (uVoidPhase > 2.5) {
      float age = uTime - uVoidExplosionTime;
      float flash = exp(-age * 5.6) + exp(-max(age - 0.16, 0.0) * 1.35) * 0.22;
      float ringRadius = age * 10.5;
      float ringWidth = 0.75 + age * 0.45;
      float inRing = exp(-abs(dist - ringRadius) / ringWidth);
      float recoilBand = smoothstep(0.9, 1.7, age) * (1.0 - smoothstep(2.8, 4.1, age));
      vColor = mix(vColor, vec3(1.0), clamp(flash, 0.0, 1.0));
      vColor += vec3(1.0, 0.82, 0.35) * inRing * strength * 2.3;
      vColor += vec3(0.28, 0.72, 1.0) * recoilBand * (1.0 - smoothstep(0.0, 4.8, dist)) * 0.55;
    }
  } else {
    float forceOn = smoothstep(0.0, 1.0, uForceStrength);
    vec3 forceField = vec3(0.0);

    if (uForceStrength > 0.01 && uForceType > 0.5) {
      float strength = uForceStrength * lifeBreath;
      if (uForceType < 1.5) {
        forceField += attractForce(energeticPos, uHandPos, strength);
      } else if (uForceType < 2.5) {
        forceField += repelForce(energeticPos, uHandPos, strength);
      } else {
        forceField += pointForce(energeticPos, uFingertipPos, strength);
      }
    }

    vec3 dualField = uDuality > 0.01 ? dualOrbitForce(energeticPos, uHandPos, uHand2Pos, uDuality * uInteractionPresence) : vec3(0.0);
    vec3 depthField = (uForceType > 0.5 || uDuality > 0.01)
      ? depthShear(energeticPos, uDepthBias, uHandPos)
      : vec3(0.0);
    forceField += dualField + depthField;

    float flowSuppression = 1.0 - min(1.0, forceOn * forceOn + uFlowWeight * 0.25);
    float saturnScene = uShapeMode > 2.5 && uShapeMode < 3.5 ? 1.0 : 0.0;
    float saturnFlowDamp = mix(1.0, 0.18, saturnScene);
    float saturnForceBoost = mix(1.0, 1.08, saturnScene);
    vec3 forceDisplacement = forceField * (forceOn * 1.35 + uInteractionPresence * 0.15 + uDuality * 0.1) * saturnForceBoost;
    displaced = energeticPos + naturalFlow * saturnFlowDamp * max(0.04, 1.0 - uFlowWeight) * (0.14 + flowSuppression * 0.38) + forceDisplacement;

    float distFromOrigin = length(energeticPos);
    float shapeAngle = atan(energeticPos.z, energeticPos.x);
    float planeRadius = length(energeticPos.xz);
    vColor = distancePalette(distFromOrigin, forceOn + uCinematicEnergy * 0.15 + uDuality * 0.12, aColor, uShapeMode);

    if (uShapeMode < 1.5) {
      float coreGlow = 1.0 - smoothstep(1.2, 6.6, distFromOrigin);
      float orbitGlow = smoothstep(6.0, 7.1, distFromOrigin) * (1.0 - smoothstep(8.7, 10.4, distFromOrigin));
      vColor = mix(vColor, vec3(0.95, 0.99, 1.0), coreGlow * 0.32);
      vColor += vec3(0.1, 0.62, 1.0) * orbitGlow * 0.16;
    } else if (uShapeMode < 2.5) {
      float braid = 0.5 + 0.5 * sin(shapeAngle * 3.0 + energeticPos.y * 0.9 + aRandom * 4.0);
      vColor = mix(vColor, mix(vec3(1.0, 0.62, 0.18), vec3(0.92, 0.3, 1.0), braid), 0.42);
    } else if (uShapeMode > 2.5 && uShapeMode < 3.5) {
      float diskTightness = 1.0 - smoothstep(0.1, 0.6, abs(energeticPos.y));
      float coreMask = (1.0 - smoothstep(1.4, 2.7, distFromOrigin)) * (0.82 + diskTightness * 0.18);
      float innerShell = smoothstep(2.2, 3.3, planeRadius) * (1.0 - smoothstep(4.6, 5.8, planeRadius));
      float mainRing = smoothstep(4.8, 6.2, planeRadius) * (1.0 - smoothstep(10.8, 12.8, planeRadius)) * (0.5 + diskTightness * 0.5);
      float outerTail = smoothstep(10.8, 12.6, planeRadius) * (1.0 - smoothstep(16.8, 18.6, planeRadius)) * (0.36 + diskTightness * 0.28);
      vec3 coreColor = vec3(0.88, 0.94, 1.0);
      vec3 shellColor = vec3(1.0, 0.96, 0.82);
      vec3 ringColor = vec3(1.0, 0.82, 0.18);
      vec3 tailColor = vec3(0.96, 0.68, 0.12);
      vColor = mix(vColor, coreColor, coreMask * 0.86);
      vColor = mix(vColor, shellColor, innerShell * 0.62);
      vColor = mix(vColor, ringColor, mainRing * 1.08);
      vColor = mix(vColor, tailColor, outerTail * 0.72);
      vColor += ringColor * mainRing * (0.18 + uInteractionPresence * 0.12 + uDuality * 0.06);
    } else if (uShapeMode < 4.5) {
      float helixBand = 0.5 + 0.5 * sin(shapeAngle * 2.0 + energeticPos.y * 0.72);
      vColor = mix(vColor, mix(vec3(0.16, 0.9, 1.0), vec3(0.96, 0.34, 1.0), helixBand), 0.46);
    } else if (uShapeMode < 5.5) {
      float coreHeat = 1.0 - smoothstep(0.4, 4.0, distFromOrigin);
      vColor = mix(vColor, vec3(1.0, 0.96, 0.78), coreHeat * 0.24);
    } else if (uShapeMode < 6.5) {
      float electric = 0.5 + 0.5 * sin((energeticPos.x + energeticPos.y + energeticPos.z) * 1.2 + aRandom * 6.0);
      vColor = mix(vColor, mix(vec3(0.28, 0.54, 1.0), vec3(0.82, 0.9, 1.0), electric), 0.34);
    } else if (uShapeMode < 7.5) {
      float galacticCore = 1.0 - smoothstep(0.6, 4.4, distFromOrigin);
      float armTint = 0.5 + 0.5 * sin(shapeAngle * 2.0 + distFromOrigin * 0.35);
      vColor = mix(vColor, vec3(1.0, 0.94, 0.7), galacticCore * 0.34);
      vColor = mix(vColor, mix(vec3(0.2, 0.42, 1.0), vec3(0.96, 0.48, 1.0), armTint), 0.18);
    } else {
      float diskHeat = smoothstep(1.4, 3.4, distFromOrigin) * (1.0 - smoothstep(9.8, 12.4, distFromOrigin));
      vColor = mix(vColor, vec3(1.0, 0.48, 0.14), diskHeat * 0.32);
    }

    float forceMag = length(forceDisplacement) + length(dualField) * 0.18;
    vForceIntensity = clamp(forceMag * 2.2 + uShapeTransition * 0.32 + uInteractionPresence * 0.18, 0.0, 1.0);
  }

  vPulseGlow = clamp(
    uCinematicPulse * 0.4 +
      uCinematicEnergy * 0.24 +
      uShapeTransition * 0.24 +
      uInteractionPresence * 0.18 +
      uDuality * 0.14,
    0.0,
    1.1
  );

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float viewDist = length(mvPosition.xyz);
  float saturnBoost = uShapeMode > 2.5 && uShapeMode < 3.5 ? 0.42 : 0.0;
  float sizeScale = 0.92 + saturnBoost + vForceIntensity * 0.66 + vPulseGlow * 0.34 + uDepthBias * 0.08;
  sizeScale *= exp(vForceIntensity * 0.12 + vPulseGlow * 0.03 + saturnBoost * 0.12);
  gl_PointSize = aSize * sizeScale * uPixelRatio * (180.0 / -mvPosition.z);
  gl_PointSize = clamp(gl_PointSize, 0.26, 6.8);

  float galleryOpacity = mix(1.0, 0.82, uGalleryMode);
  vAlpha = smoothstep(38.0, 4.0, viewDist) * (0.84 + uCinematicEnergy * 0.14 + uInteractionPresence * 0.06) * galleryOpacity;
}
