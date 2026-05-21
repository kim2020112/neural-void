attribute float aSize;
attribute vec3 aColor;

varying vec3 vColor;
varying float vAlpha;

uniform float uTime;
uniform float uPixelRatio;
uniform vec2 uMouse;
uniform float uParticleCount;

// Hand force field uniforms
uniform vec3 uHandPos;
uniform float uForceType;    // 0=none, 1=attract, 2=repel, 3=point
uniform float uForceStrength; // 0-1 transition
uniform vec3 uFingertipPos;

// Void Core uniforms
uniform vec3 uVoidCenter;
uniform float uVoidPhase;          // 0=idle, 1=forming, 2=active, 3=exploding
uniform float uVoidStrength;       // 0-1 lerped transition
uniform float uVoidExplosionTime;  // R3F clock when explosion started, -1 inactive

// ─── Simplex 3D ─────────────────────────────────────────────

vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
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

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// ─── Curl Noise ──────────────────────────────────────────────

vec3 curlNoise(vec3 p, float t) {
  float eps = 0.5;
  float n1 = snoise(p + vec3(eps, 0.0, 0.0) + t * 0.1);
  float n2 = snoise(p + vec3(-eps, 0.0, 0.0) + t * 0.1);
  float n3 = snoise(p + vec3(0.0, eps, 0.0) + t * 0.1);
  float n4 = snoise(p + vec3(0.0, -eps, 0.0) + t * 0.1);
  float n5 = snoise(p + vec3(0.0, 0.0, eps) + t * 0.1);
  float n6 = snoise(p + vec3(0.0, 0.0, -eps) + t * 0.1);

  float x = n4 - n3;
  float y = n6 - n5;
  float z = n1 - n2;

  float denom = 2.0 * eps;
  return vec3(x, y, z) / denom;
}

// ─── Force Fields ────────────────────────────────────────────

// Soft attraction: particles collapse toward a point
vec3 attractForce(vec3 pos, vec3 center, float strength) {
  vec3 dir = center - pos;
  float dist = length(dir);
  // Inverse-square with soft core to prevent singularity
  float magnitude = strength / (dist * dist + 0.6);
  // Radial falloff beyond 8 units
  magnitude *= 1.0 - smoothstep(4.0, 10.0, dist);
  return normalize(dir) * magnitude * 20.0;
}

// Repulsion: particles pushed outward from a point
vec3 repelForce(vec3 pos, vec3 center, float strength) {
  vec3 dir = pos - center;
  float dist = length(dir);
  // Strongest at ~2-5 units, creating a shockwave ring
  float ring = exp(-abs(dist - 3.5) * 0.7);
  float near = 1.0 / (dist * dist + 0.8);
  float magnitude = strength * (ring * 1.8 + near * 0.6);
  magnitude *= 1.0 - smoothstep(8.0, 20.0, dist);
  return normalize(dir) * magnitude * 18.0;
}

// Point: particles near fingertip follow it
vec3 pointForce(vec3 pos, vec3 tip, float strength) {
  vec3 dir = tip - pos;
  float dist = length(dir);
  float magnitude = strength / (dist * dist + 0.3);
  magnitude *= 1.0 - smoothstep(2.5, 10.0, dist);
  return normalize(dir) * magnitude * 12.0;
}

// ─── Tangent helper ─────────────────────────────────────────

vec3 getTangent(vec3 radial) {
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 t = normalize(cross(radial, up));
  if (length(t) < 0.001) {
    t = normalize(cross(radial, vec3(1.0, 0.0, 0.0)));
  }
  return t;
}

// ─── Void Core Force Fields ──────────────────────────────────

// Gravitational lensing: tangential distortion around void center
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

// Vortex: spiral infall with accretion disk + event horizon
vec3 vortexForce(vec3 pos, vec3 center, float strength) {
  vec3 toCenter = center - pos;
  float dist = length(toCenter);
  vec3 radial = normalize(toCenter);
  vec3 tangent = getTangent(radial);

  // Flatten to XZ plane for accretion disk near center
  float diskFlatten = 1.0 - smoothstep(1.0, 4.0, dist);
  radial.y *= (1.0 - diskFlatten * 0.8);

  // Orbital speed ramps up near center
  float speed = strength / (dist * dist + 0.15);
  float distMask = 1.0 - smoothstep(8.0, 25.0, dist);

  // Event horizon: extreme suction within inner radius
  float horizonPull = smoothstep(1.2, 0.3, dist);
  float horizonBoost = 1.0 + horizonPull * 8.0;

  // Spiral = orbit + infall
  vec3 spiral = tangent * speed * 4.0 + radial * speed * 0.8;
  return spiral * distMask * horizonBoost * 25.0;
}

// Energy explosion: radial blast + traveling shockwave ring
vec3 explosionForce(vec3 pos, vec3 center, float strength, float age) {
  vec3 fromCenter = pos - center;
  float dist = length(fromCenter);
  vec3 outward = dist > 0.001 ? normalize(fromCenter) : vec3(0.0, 1.0, 0.0);

  // Expanding shockwave ring
  float ringSpeed = 8.0;
  float ringRadius = age * ringSpeed;
  float ringWidth = 1.2 + age * 0.5;
  float ring = exp(-abs(dist - ringRadius) / ringWidth);

  // Radial push: strongest near center
  float radialPush = strength / (dist * dist + 1.0);
  radialPush *= 1.0 - smoothstep(6.0, 30.0, dist);

  // Decay over ~3.5 seconds
  float decay = 1.0 - smoothstep(2.0, 4.0, age);
  float fadeIn = smoothstep(0.0, 0.15, age);

  return outward * (radialPush * 12.0 + ring * strength * 30.0) * decay * fadeIn;
}

// Void core color remapping
// Center: blazing white → electric blue → deep purple → dark blue
vec3 voidCoreColor(vec3 pos, vec3 center, float strength, vec3 baseColor) {
  float dist = length(pos - center);

  vec3 hotWhite     = vec3(1.0, 1.0, 1.0);
  vec3 electricBlue = vec3(0.1, 0.45, 1.0);
  vec3 deepPurple   = vec3(0.35, 0.05, 0.65);
  vec3 darkBlue     = vec3(0.04, 0.02, 0.18);

  // Smooth color zones
  float whiteZone  = 1.0 - smoothstep(0.3, 2.0, dist);
  float blueZone   = smoothstep(0.8, 3.0, dist) * (1.0 - smoothstep(5.0, 8.0, dist));
  float purpleZone = smoothstep(5.0, 8.0, dist) * (1.0 - smoothstep(10.0, 14.0, dist));
  float darkZone   = smoothstep(10.0, 14.0, dist);

  vec3 voidCol = hotWhite * whiteZone
               + electricBlue * blueZone
               + deepPurple * purpleZone
               + darkBlue * darkZone;

  // Blend: void color dominates based on strength
  return mix(baseColor, voidCol, strength);
}

// ─── Main ────────────────────────────────────────────────────

void main() {
  vec3 pos = position;

  // ── Curl noise flow ──────────────────────────────────────
  float scale1 = 0.6;
  float scale2 = 0.25;
  float scale3 = 0.1;

  vec3 curl1 = curlNoise(pos * scale1, uTime * 0.3);
  vec3 curl2 = curlNoise(pos * scale2 + 100.0, uTime * 0.5);
  vec3 curl3 = curlNoise(pos * scale3 - 50.0, uTime * 0.2);

  vec3 velocity = curl1 * 0.5 + curl2 * 0.3 + curl3 * 0.2;

  // Mouse influence — reduced when any force is active
  float mouseWeight = 0.15 * (1.0 - max(uForceStrength, uVoidStrength) * 0.7);
  vec3 mouseInfluence = vec3(uMouse.x * 0.8, uMouse.y * 0.5, uMouse.x * 0.3);
  velocity += mouseInfluence * mouseWeight;

  vec3 naturalFlow = velocity * 2.5;

  // ── Force dispatch ───────────────────────────────────────
  vec3 forceField = vec3(0.0);
  float forceBoost = 1.0;
  float breathe = 1.0 + sin(uTime * 2.5) * 0.08;
  vec3 displaced;

  if (uForceType > 3.5 && uVoidStrength > 0.01) {
    // ═══ VOID CORE MODE ═══
    float s = uVoidStrength * breathe;
    vec3 voidForce = vec3(0.0);

    if (uVoidPhase < 1.5) {
      // Phase 1: FORMING — gravitational lensing only
      voidForce = lensingForce(pos, uVoidCenter, s);
    } else if (uVoidPhase < 2.5) {
      // Phase 2: ACTIVE — full vortex + lensing
      vec3 lens = lensingForce(pos, uVoidCenter, s * 0.4);
      vec3 vortex = vortexForce(pos, uVoidCenter, s);
      voidForce = lens + vortex;
    } else {
      // Phase 3: EXPLODING — radial blast with shockwave
      float age = uTime - uVoidExplosionTime;
      voidForce = explosionForce(pos, uVoidCenter, s, age);
    }

    displaced = pos + mix(naturalFlow, voidForce, uVoidStrength * 0.9);

    // ── Void core color ──────────────────────────────
    if (uVoidPhase < 2.5) {
      // Forming / Active: distance-based color zones
      vColor = voidCoreColor(pos, uVoidCenter, uVoidStrength, aColor);
    } else {
      // Exploding: bright flash + residual void color
      float age = uTime - uVoidExplosionTime;
      float flash = exp(-age * 2.5);
      vec3 flashCol = mix(aColor, vec3(1.0, 1.0, 1.0), flash * 0.9);
      vColor = mix(flashCol, voidCoreColor(pos, uVoidCenter, s, aColor), 0.4);

      // Boost brightness inside shockwave ring
      float dist = length(pos - uVoidCenter);
      float ringRadius = age * 8.0;
      float inRing = exp(-abs(dist - ringRadius) * 1.5);
      vColor += vec3(1.0, 0.8, 0.3) * inRing * s * 2.0;
    }
  } else {
    // ═══ NORMAL GESTURE MODE ═══
    if (uForceStrength > 0.01) {
      float s = uForceStrength * breathe;

      if (uForceType < 1.5) {
        forceField += attractForce(pos, uHandPos, s);
      } else if (uForceType < 2.5) {
        forceField += repelForce(pos, uHandPos, s);
        float dist = length(pos - uHandPos);
        forceBoost = 1.0 + exp(-abs(dist - 3.5) * 0.8) * s * 1.5;
      } else {
        forceField += pointForce(pos, uFingertipPos, s);
        float tipDist = length(pos - uFingertipPos);
        forceBoost = 1.0 + exp(-tipDist * 1.2) * s * 2.0;
      }
    }

    displaced = pos + mix(naturalFlow, forceField, uForceStrength * 0.85);
    vColor = aColor * forceBoost;
  }

  // ── Render ────────────────────────────────────────────────
  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float viewDist = length(mvPosition.xyz);
  gl_PointSize = aSize * uPixelRatio * (180.0 / -mvPosition.z);
  gl_PointSize = clamp(gl_PointSize, 0.5, 8.0);

  vAlpha = smoothstep(30.0, 5.0, viewDist);
}
