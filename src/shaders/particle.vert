attribute float aSize;
attribute vec3 aColor;

varying vec3 vColor;
varying float vAlpha;
varying float vForceIntensity;

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

// ─── Dual-Tone Palette: Ice Blue → Liquid Gold ──────────────

vec3 distancePalette(float dist, float forceIntensity, vec3 seed) {
  // Normalize distance to 0-1 range for this galaxy scale
  float t = clamp(dist / 16.0, 0.0, 1.0);

  // Aurora Ice Blue (core)
  vec3 iceBlue   = vec3(0.0, 0.90, 1.0);
  vec3 auroraCyan = vec3(0.0, 0.78, 0.92);

  // Liquid Gold (mid)
  vec3 liquidGold = vec3(1.0, 0.72, 0.08);

  // Amber Flame (outer)
  vec3 amberFlame = vec3(1.0, 0.38, 0.02);

  // Four-zone smooth blend
  float zone1 = 1.0 - smoothstep(0.0, 0.25, t);           // 0-25%: ice blue
  float zone2 = smoothstep(0.15, 0.35, t) * (1.0 - smoothstep(0.45, 0.55, t)); // aurora cyan
  float zone3 = smoothstep(0.45, 0.60, t) * (1.0 - smoothstep(0.75, 0.85, t)); // liquid gold
  float zone4 = smoothstep(0.75, 0.90, t);                 // amber flame

  vec3 baseColor = iceBlue * zone1
                 + auroraCyan * zone2
                 + liquidGold * zone3
                 + amberFlame * zone4;

  // Force intensity pushes toward blazing white
  vec3 hotShift = mix(baseColor, vec3(1.0, 1.0, 1.0), forceIntensity * 0.7);

  // Subtle per-particle hue variation from seed
  vec3 tint = (seed - 0.5) * 0.12;
  return clamp(hotShift + tint, 0.0, 1.0);
}

// ─── Gaussian Force Fields ──────────────────────────────────

// Attraction: Gaussian capture ring + exponential close-range pull
vec3 attractForce(vec3 pos, vec3 center, float strength) {
  vec3 dir = center - pos;
  float dist = length(dir);
  if (dist < 0.001) return vec3(0.0);

  // Gaussian capture bell at optimal range ~3 units
  float capture = exp(-pow(dist - 2.8, 2.0) / 2.8);
  // Exponential close-range vacuum
  float closePull = exp(-dist * 1.4) * 2.5;
  // Gentle long-range awareness
  float longRange = exp(-dist * 0.12) * 0.35;

  float magnitude = strength * (capture * 2.2 + closePull + longRange);
  magnitude *= 1.0 - smoothstep(12.0, 28.0, dist);

  return normalize(dir) * magnitude * 30.0;
}

// Repulsion: Gaussian push ring + close-range explosive push
vec3 repelForce(vec3 pos, vec3 center, float strength) {
  vec3 dir = pos - center;
  float dist = length(dir);
  if (dist < 0.001) return vec3(0.0);

  // Gaussian push ring at ~3.5 units
  float pushRing = exp(-pow(dist - 3.5, 2.0) / 2.5);
  // Explosive close-range push
  float closePush = exp(-dist * 1.0) * 2.8;
  // Broader repulsion field
  float broad = exp(-dist * 0.25) * 0.3;

  float magnitude = strength * (pushRing * 2.8 + closePush + broad);
  magnitude *= 1.0 - smoothstep(14.0, 32.0, dist);

  return normalize(dir) * magnitude * 28.0;
}

// Point: Focused Gaussian tracking
vec3 pointForce(vec3 pos, vec3 tip, float strength) {
  vec3 dir = tip - pos;
  float dist = length(dir);
  if (dist < 0.001) return vec3(0.0);

  // Tight Gaussian focus around fingertip
  float focus = exp(-pow(dist, 2.0) / 2.5);
  // Secondary wider field
  float wide = exp(-dist * 0.5) * 0.6;

  float magnitude = strength * (focus * 2.5 + wide);
  magnitude *= 1.0 - smoothstep(8.0, 22.0, dist);

  return normalize(dir) * magnitude * 24.0;
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
  radial.y *= (1.0 - diskFlatten * 0.8);

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

  float ringSpeed = 8.0;
  float ringRadius = age * ringSpeed;
  float ringWidth = 1.2 + age * 0.5;
  float ring = exp(-abs(dist - ringRadius) / ringWidth);

  float radialPush = strength / (dist * dist + 1.0);
  radialPush *= 1.0 - smoothstep(6.0, 30.0, dist);

  float decay = 1.0 - smoothstep(2.0, 4.0, age);
  float fadeIn = smoothstep(0.0, 0.15, age);

  return outward * (radialPush * 12.0 + ring * strength * 30.0) * decay * fadeIn;
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

  // Mouse influence — suppressed when force active
  float mouseWeight = 0.15 * (1.0 - max(uForceStrength, uVoidStrength) * 0.85);
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
      voidForce = lensingForce(pos, uVoidCenter, s);
    } else if (uVoidPhase < 2.5) {
      vec3 lens = lensingForce(pos, uVoidCenter, s * 0.4);
      vec3 vortex = vortexForce(pos, uVoidCenter, s);
      voidForce = lens + vortex;
    } else {
      float age = uTime - uVoidExplosionTime;
      voidForce = explosionForce(pos, uVoidCenter, s, age);
    }

    displaced = pos + mix(naturalFlow, voidForce, uVoidStrength * 0.9);

    float forceMag = length(voidForce) * uVoidStrength;
    vForceIntensity = clamp(forceMag * 1.5, 0.0, 1.0);

    // Void-core palette: center white → ice-blue → deep purple → black
    float dist = length(pos - uVoidCenter);
    float dt = clamp(dist / 14.0, 0.0, 1.0);

    vec3 voidWhite  = vec3(1.0, 1.0, 1.0);
    vec3 voidIce    = vec3(0.0, 0.85, 1.0);
    vec3 voidPurple = vec3(0.45, 0.08, 0.80);
    vec3 voidDark   = vec3(0.03, 0.02, 0.15);

    float w0 = 1.0 - smoothstep(0.0, 0.25, dt);
    float w1 = smoothstep(0.15, 0.35, dt) * (1.0 - smoothstep(0.55, 0.65, dt));
    float w2 = smoothstep(0.55, 0.68, dt) * (1.0 - smoothstep(0.85, 0.95, dt));
    float w3 = smoothstep(0.85, 0.95, dt);

    vec3 vcCol = voidWhite * w0 + voidIce * w1 + voidPurple * w2 + voidDark * w3;

    if (uVoidPhase < 2.5) {
      vColor = vcCol;
    } else {
      float age = uTime - uVoidExplosionTime;
      float flash = exp(-age * 2.5);
      vec3 flashCol = mix(vcCol, vec3(1.0, 1.0, 1.0), flash * 0.9);
      vColor = flashCol;

      float ringRadius = age * 8.0;
      float inRing = exp(-abs(dist - ringRadius) * 1.5);
      vColor += vec3(1.0, 0.8, 0.3) * inRing * s * 2.0;
    }
  } else {
    // ═══ NORMAL GESTURE MODE ═══
    float forceOn = smoothstep(0.0, 1.0, uForceStrength);

    if (uForceStrength > 0.01) {
      float s = uForceStrength * breathe;

      if (uForceType < 1.5) {
        forceField += attractForce(pos, uHandPos, s);
      } else if (uForceType < 2.5) {
        forceField += repelForce(pos, uHandPos, s);
      } else {
        forceField += pointForce(pos, uFingertipPos, s);
      }
    }

    // Aggressive noise suppression when force is active
    // forceOn^2 creates strong snap: particles abandon curl flow, align to force
    float noiseSuppression = 1.0 - forceOn * forceOn;
    vec3 forceDisplacement = forceField * forceOn * 1.5;
    displaced = pos + naturalFlow * noiseSuppression * 0.12 + forceDisplacement;

    // ── Dual-tone palette: distance-based ice-blue → gold ──
    float distFromOrigin = length(pos);
    vColor = distancePalette(distFromOrigin, forceOn, aColor);

    float forceMag = length(forceDisplacement);
    vForceIntensity = clamp(forceMag * 2.5, 0.0, 1.0);
  }

  // ── Render ────────────────────────────────────────────────
  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float viewDist = length(mvPosition.xyz);

  // Exponential size growth under force: particles swell dramatically
  float sizeScale = 1.0 + vForceIntensity * 1.8;
  sizeScale *= exp(vForceIntensity * 0.55);
  gl_PointSize = aSize * sizeScale * uPixelRatio * (220.0 / -mvPosition.z);
  gl_PointSize = clamp(gl_PointSize, 0.3, 9.0);

  vAlpha = smoothstep(35.0, 4.0, viewDist);
}
