import * as THREE from 'three'

// Keyed by `${material.uuid}_${scale}` — avoids recompiling the shader per mesh
const _cache = new Map()

/**
 * Clones a MeshStandardMaterial and patches its shader with triplanar world-space
 * texture mapping. The diffuse map is sampled three times (XY, XZ, YZ planes) and
 * blended by the world-space surface normal, so deformed geometry never shows UV stretch.
 *
 * All other PBR properties (roughness, metalness, normal map, etc.) are preserved.
 */
export function patchTriplanarMaterial(material, scale = 1.0) {
    const key = `${material.uuid}_${scale}`
    if (_cache.has(key)) return _cache.get(key)

    const patched = material.clone()

    patched.onBeforeCompile = (shader) => {
        shader.uniforms.uTriplanarScale = { value: scale }

        // ── Vertex: declare varyings ─────────────────────────────────────────
        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
varying vec3 vWorldPos;
varying vec3 vWorldNormal;`
        )

        // World-space normal — computed from object-space normal after it is set
        shader.vertexShader = shader.vertexShader.replace(
            '#include <beginnormal_vertex>',
            `#include <beginnormal_vertex>
vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
        )

        // World-space position — computed after 'transformed' is set
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        )

        // ── Fragment: declare varyings + triplanar uniform ───────────────────
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
uniform float uTriplanarScale;`
        )

        // Replace UV-based diffuse map sampling with triplanar blend
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `#ifdef USE_MAP
  // Blend weights: sharpen normal components so seams stay tight
  vec3 _tp_blend = abs(vWorldNormal);
  _tp_blend = pow(_tp_blend, vec3(4.0));
  _tp_blend /= dot(_tp_blend, vec3(1.0));

  vec4 _tp_x = texture2D(map, vWorldPos.yz * uTriplanarScale);
  vec4 _tp_y = texture2D(map, vWorldPos.xz * uTriplanarScale);
  vec4 _tp_z = texture2D(map, vWorldPos.xy * uTriplanarScale);
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
