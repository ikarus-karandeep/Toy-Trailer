import * as THREE from 'three'

// Keyed by material uuid + all 6 scale components — avoids recompiling the shader per mesh
const _cache = new Map()

/**
 * Clones a MeshStandardMaterial and patches its shader with triplanar world-space
 * texture mapping. Each projection face has its own vec2 UV scale, allowing
 * independent squeezing/stretching per face:
 *   scaleX (vec2) → X-facing surfaces, samples worldPos.yz  (u=Y, v=Z)
 *   scaleY (vec2) → Y-facing surfaces, samples worldPos.xz  (u=X, v=Z)
 *   scaleZ (vec2) → Z-facing surfaces, samples worldPos.xy  (u=X, v=Y)
 *
 * Pass a single number for uniform tiling on all faces, or an object
 * { x: Vector2, y: Vector2, z: Vector2 } for per-face control.
 */
export function patchTriplanarMaterial(material, scale = 1.0) {
    let sx, sy, sz
    if (typeof scale === 'number') {
        sx = new THREE.Vector2(scale, scale)
        sy = new THREE.Vector2(scale, scale)
        sz = new THREE.Vector2(scale, scale)
    } else {
        sx = scale.x instanceof THREE.Vector2 ? scale.x : new THREE.Vector2(scale.x, scale.x)
        sy = scale.y instanceof THREE.Vector2 ? scale.y : new THREE.Vector2(scale.y, scale.y)
        sz = scale.z instanceof THREE.Vector2 ? scale.z : new THREE.Vector2(scale.z, scale.z)
    }

    const key = `${material.uuid}_${sx.x}_${sx.y}_${sy.x}_${sy.y}_${sz.x}_${sz.y}`
    if (_cache.has(key)) return _cache.get(key)

    const patched = material.clone()

    patched.customProgramCacheKey = () => {
        return `triplanar_${sx.x}_${sx.y}_${sz.x}_map:${!!patched.map}_norm:${!!patched.normalMap}_rough:${!!patched.roughnessMap}_metal:${!!patched.metalnessMap}`
    }

    patched.onBeforeCompile = (shader) => {
        shader.uniforms.uScaleX = { value: sx }
        shader.uniforms.uScaleY = { value: sy }
        shader.uniforms.uScaleZ = { value: sz }

        // ── Vertex: declare varyings ─────────────────────────────────────────
        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
varying vec3 vWorldPos;
varying vec3 vWorldNormal;`
        )

        shader.vertexShader = shader.vertexShader.replace(
            '#include <beginnormal_vertex>',
            `#include <beginnormal_vertex>
vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
        )

        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        )

        // ── Fragment: declare varyings + per-face scale uniforms ─────────────
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
uniform vec2 uScaleX;
uniform vec2 uScaleY;
uniform vec2 uScaleZ;

vec2 getTriplanarUvX(vec3 pos, vec3 normal) {
  return vec2(pos.z * -sign(normal.x), -pos.y);
}
vec2 getTriplanarUvY(vec3 pos, vec3 normal) {
  return vec2(pos.x * sign(normal.y), pos.z * sign(normal.y));
}
vec2 getTriplanarUvZ(vec3 pos, vec3 normal) {
  return vec2(pos.x * sign(normal.z), -pos.y);
}`
        )

        // Replace UV-based diffuse map sampling with triplanar blend
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `#ifdef USE_MAP
  vec3 _tp_normal = vWorldNormal;
  if (length(_tp_normal) < 0.1) {
    _tp_normal = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
  }
  vec3 _tp_blend = abs(_tp_normal);
  float _tp_dom = max(_tp_blend.x, max(_tp_blend.y, _tp_blend.z));
  _tp_blend = step(_tp_dom - 0.001, _tp_blend);
  _tp_blend /= max(dot(_tp_blend, vec3(1.0)), 0.001);

  vec4 _tp_x = texture2D(map, getTriplanarUvX(vWorldPos, vWorldNormal) * uScaleX);
  vec4 _tp_y = texture2D(map, getTriplanarUvY(vWorldPos, vWorldNormal) * uScaleY);
  vec4 _tp_z = texture2D(map, getTriplanarUvZ(vWorldPos, vWorldNormal) * uScaleZ);
  vec4 sampledDiffuseColor = _tp_x * _tp_blend.x + _tp_y * _tp_blend.y + _tp_z * _tp_blend.z;

  #ifdef DECODE_VIDEO_TEXTURE
    sampledDiffuseColor = vec4(mix(
      pow(sampledDiffuseColor.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)),
      sampledDiffuseColor.rgb * 0.0773993808,
      vec3(lessThanEqual(sampledDiffuseColor.rgb, vec3(0.04045)))
    ), sampledDiffuseColor.w);
  #endif

  diffuseColor *= sampledDiffuseColor;
#endif`
        )

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <roughnessmap_fragment>',
            `float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
  vec3 _tr_blend = abs(vWorldNormal);
  float _tr_dom = max(_tr_blend.x, max(_tr_blend.y, _tr_blend.z));
  _tr_blend = step(_tr_dom - 0.001, _tr_blend);
  _tr_blend /= max(dot(_tr_blend, vec3(1.0)), 0.001);

  vec4 _tr_x = texture2D(roughnessMap, getTriplanarUvX(vWorldPos, vWorldNormal) * uScaleX);
  vec4 _tr_y = texture2D(roughnessMap, getTriplanarUvY(vWorldPos, vWorldNormal) * uScaleY);
  vec4 _tr_z = texture2D(roughnessMap, getTriplanarUvZ(vWorldPos, vWorldNormal) * uScaleZ);
  vec4 sampledRoughness = _tr_x * _tr_blend.x + _tr_y * _tr_blend.y + _tr_z * _tr_blend.z;
  roughnessFactor *= sampledRoughness.g;
#endif`
        )

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <metalnessmap_fragment>',
            `float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
  vec3 _tm_blend = abs(vWorldNormal);
  float _tm_dom = max(_tm_blend.x, max(_tm_blend.y, _tm_blend.z));
  _tm_blend = step(_tm_dom - 0.001, _tm_blend);
  _tm_blend /= max(dot(_tm_blend, vec3(1.0)), 0.001);

  vec4 _tm_x = texture2D(metalnessMap, getTriplanarUvX(vWorldPos, vWorldNormal) * uScaleX);
  vec4 _tm_y = texture2D(metalnessMap, getTriplanarUvY(vWorldPos, vWorldNormal) * uScaleY);
  vec4 _tm_z = texture2D(metalnessMap, getTriplanarUvZ(vWorldPos, vWorldNormal) * uScaleZ);
  vec4 sampledMetalness = _tm_x * _tm_blend.x + _tm_y * _tm_blend.y + _tm_z * _tm_blend.z;
  metalnessFactor *= sampledMetalness.b;
#endif`
        )



        // Replace UV-based normal/bump map sampling with triplanar world-space blend.
        // normalMap: each projection plane swizzles its tangent-space sample into world space:
        //   X-face (UV=zy): tangent=+Z, bitangent=+Y  →  world(B·signX, G, R)
        //   Y-face (UV=x,-z): tangent=+X, bitangent=-Z  →  world(R, B·signY, -G)
        //   Z-face (UV=xy): tangent=+X, bitangent=+Y  →  world(R, G, B·signZ)
        // bumpMap: samples height at 3 projection planes, blends finite-difference gradients,
        //   then calls perturbNormalArb (defined by Three.js's bumpmap_pars_fragment).
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <normal_fragment_maps>',
            `#ifdef USE_NORMALMAP
  vec3 _tn_blend = abs(vWorldNormal);
  float _tn_dom = max(_tn_blend.x, max(_tn_blend.y, _tn_blend.z));
  _tn_blend = step(_tn_dom - 0.001, _tn_blend);
  _tn_blend /= max(dot(_tn_blend, vec3(1.0)), 0.001);

  vec3 _ts_x = texture2D(normalMap, getTriplanarUvX(vWorldPos, vWorldNormal) * uScaleX).xyz * 2.0 - 1.0;
  vec3 _ts_y = texture2D(normalMap, getTriplanarUvY(vWorldPos, vWorldNormal) * uScaleY).xyz * 2.0 - 1.0;
  vec3 _ts_z = texture2D(normalMap, getTriplanarUvZ(vWorldPos, vWorldNormal) * uScaleZ).xyz * 2.0 - 1.0;

  _ts_x.xy *= normalScale;
  _ts_y.xy *= normalScale;
  _ts_z.xy *= normalScale;

  vec3 _wn_x = normalize(vec3(_ts_x.b * sign(vWorldNormal.x), _ts_x.g, _ts_x.r));
  vec3 _wn_y = normalize(vec3(_ts_y.r, _ts_y.b * sign(vWorldNormal.y), -_ts_y.g));
  vec3 _wn_z = normalize(vec3(_ts_z.r, _ts_z.g, _ts_z.b * sign(vWorldNormal.z)));

  vec3 _tp_worldN = normalize(_wn_x * _tn_blend.x + _wn_y * _tn_blend.y + _wn_z * _tn_blend.z);
  normal = normalize(mat3(viewMatrix) * _tp_worldN);
#endif

#ifdef USE_BUMPMAP
  vec3 _bp_blend = abs(vWorldNormal);
  float _bp_dom = max(_bp_blend.x, max(_bp_blend.y, _bp_blend.z));
  _bp_blend = step(_bp_dom - 0.001, _bp_blend);
  _bp_blend /= max(dot(_bp_blend, vec3(1.0)), 0.001);

  float _bp_eps = 0.001;

  float _hx_c  = texture2D(bumpMap, getTriplanarUvX(vWorldPos, vWorldNormal) * uScaleX).r;
  float _hx_du = texture2D(bumpMap, (getTriplanarUvX(vWorldPos, vWorldNormal) + vec2(_bp_eps, 0.0)) * uScaleX).r;
  float _hx_dv = texture2D(bumpMap, (getTriplanarUvX(vWorldPos, vWorldNormal) + vec2(0.0, _bp_eps)) * uScaleX).r;

  float _hy_c  = texture2D(bumpMap, getTriplanarUvY(vWorldPos, vWorldNormal) * uScaleY).r;
  float _hy_du = texture2D(bumpMap, (getTriplanarUvY(vWorldPos, vWorldNormal) + vec2(_bp_eps, 0.0)) * uScaleY).r;
  float _hy_dv = texture2D(bumpMap, (getTriplanarUvY(vWorldPos, vWorldNormal) + vec2(0.0, _bp_eps)) * uScaleY).r;

  float _hz_c  = texture2D(bumpMap, getTriplanarUvZ(vWorldPos, vWorldNormal) * uScaleZ).r;
  float _hz_du = texture2D(bumpMap, (getTriplanarUvZ(vWorldPos, vWorldNormal) + vec2(_bp_eps, 0.0)) * uScaleZ).r;
  float _hz_dv = texture2D(bumpMap, (getTriplanarUvZ(vWorldPos, vWorldNormal) + vec2(0.0, _bp_eps)) * uScaleZ).r;

  vec2 _bp_dHdxy = (bumpScale / _bp_eps) * (
    vec2(_hx_du - _hx_c, _hx_dv - _hx_c) * _bp_blend.x +
    vec2(_hy_du - _hy_c, _hy_dv - _hy_c) * _bp_blend.y +
    vec2(_hz_du - _hz_c, _hz_dv - _hz_c) * _bp_blend.z
  );

  normal = perturbNormalArb(-vViewPosition, normal, _bp_dHdxy, faceDirection);
#endif`
        )
    }

    patched.needsUpdate = true
    _cache.set(key, patched)
    return patched
}

/**
 * Applies a material to a mesh.
 * If mesh.userData.useTriplanar is true, the material is patched with triplanar mapping.
 * Otherwise the material is applied as-is (standard UV mapping).
 *
 * @param {THREE.Mesh} mesh
 * @param {THREE.MeshStandardMaterial} material
 * @param {number} [scale=1.0] - world-units per texture repeat (smaller = more tiled)
 */
export function applyMaterial(mesh, material, scale = 1.0) {
    if (mesh.userData?.useTriplanar) {
        
        mesh.material = patchTriplanarMaterial(material, scale)
    } else {
        
        mesh.material = material
    }
}

/**
 * Generates tiling UV coordinates on a mesh using world-space per-vertex box projection.
 * Each vertex independently picks its UV axes based on its own normal direction,
 * so corner and edge meshes (e.g. frame trim, ATP panels) get the correct diamond-plate
 * pattern instead of stretched stripes.
 *
 *   |normal_x| ≥ others → project YZ plane (side-facing)
 *   |normal_y| ≥ others → project XZ plane (floor/roof-facing)
 *   |normal_z| dominates → project XY plane (front/rear-facing)
 *
 * @param {THREE.Mesh} mesh
 * @param {number} [tileSize=0.3] - world-units per tile (smaller = tighter pattern)
 * @param {boolean} [force=false] - overwrite existing UVs
 */
export function generateBoxProjectionUVs(mesh, tileSize = 0.3, force = false) {
    const geo = mesh.geometry
    if (geo.attributes.uv && !force) return  // already has UVs, skip

    const pos = geo.attributes.position
    if (!pos) return

    mesh.updateWorldMatrix(true, false)

    const nAttr = geo.attributes.normal
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)

    const uvs = new Float32Array(pos.count * 2)
    const v = new THREE.Vector3()
    const n = new THREE.Vector3()

    for (let i = 0; i < pos.count; i++) {
        // World-space vertex position
        v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mesh.matrixWorld)

        // World-space vertex normal (per-vertex box projection)
        if (nAttr) {
            n.set(nAttr.getX(i), nAttr.getY(i), nAttr.getZ(i))
                .applyMatrix3(normalMatrix)
                .normalize()
        } else {
            // No normal attribute — fall back to +Z facing
            n.set(0, 0, 1)
        }

        const ax = Math.abs(n.x)
        const ay = Math.abs(n.y)
        const az = Math.abs(n.z)

        let u, w
        if (ax >= ay && ax >= az) {
            u = v.z / tileSize; w = v.y / tileSize  // side-facing  → YZ plane
        } else if (ay >= ax && ay >= az) {
            u = v.x / tileSize; w = v.z / tileSize  // floor/roof   → XZ plane
        } else {
            u = v.x / tileSize; w = v.y / tileSize  // front/rear   → XY plane
        }

        uvs[i * 2]     = u
        uvs[i * 2 + 1] = w
    }

    const uvAttr = new THREE.BufferAttribute(uvs, 2)
    uvAttr.needsUpdate = true
    geo.setAttribute('uv', uvAttr)
}
