import React, { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useEnvironment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const vertexShader = `
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

const fragmentShader = `
uniform sampler2D envMap;
uniform vec3 projectionCenter;
uniform float envRotation;
uniform float envScale;
varying vec3 vWorldPosition;

#define PI 3.14159265359
#define TWO_PI 6.28318530718

mat3 rotY(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(
    c, 0.0, s,
    0.0, 1.0, 0.0,
    -s, 0.0, c
  );
}

void main() {
  vec3 direction = vWorldPosition - projectionCenter;
  
  // Scale the X and Z components to pinch/stretch the projection
  direction.xz *= envScale;
  
  direction = normalize(direction);
  direction = rotY(envRotation) * direction;
  
  // Map Three.js Y-up to Blender Z-up
  float bX = direction.x;
  float bY = -direction.z;
  float bZ = direction.y;
  
  // Exact Blender math from node setup
  float u = atan(bY, bX) / TWO_PI;
  float v = (asin(bZ) / PI) - 0.5;
  
  vec2 uv = vec2(u, v);
  
  #ifdef GL_OES_standard_derivatives
  gl_FragColor = texture2D(envMap, uv);
  #else
  gl_FragColor = texture2D(envMap, uv);
  #endif
  
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function HDRIBox({ environment, size = 150, height = 1.5, envRotation = 0, envOffset = [0, 0], scale = 1.0, modelPath = null, position = [0, 0, 0] }) {
  const { gl } = useThree()
  
  const isHdr = environment?.endsWith('.hdr') || environment?.endsWith('.exr')
  const texture = useEnvironment(isHdr ? { files: environment } : { preset: environment })

  const material = useMemo(() => {
    if (!texture) return null

    // Ensure the texture wraps properly since U and V can go outside [0, 1] range
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.needsUpdate = true

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        envMap: { value: texture },
        projectionCenter: { value: new THREE.Vector3(envOffset[0] + position[0], height + position[1], envOffset[1] + position[2]) },
        envRotation: { value: envRotation },
        envScale: { value: scale }
      },
      side: THREE.DoubleSide,
      depthWrite: false, // Ensure it renders as a background
    })

    return mat
  }, [texture, gl, height, envRotation, envOffset, scale])

  if (!material) return null

  if (!material) return null

  if (modelPath) {
    return <CustomHDRIMesh url={modelPath} material={material} position={position} />
  }

  return (
    <mesh material={material} position={[position[0], size / 2 + position[1], position[2]]}>
      <boxGeometry args={[size, size, size]} />
    </mesh>
  )
}

function CustomHDRIMesh({ url, material, position }) {
  const { scene } = useGLTF(url)
  
  const clonedScene = useMemo(() => {
    const clone = scene.clone()
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = material
      }
    })
    return clone
  }, [scene, material])

  return <primitive object={clonedScene} position={position} />
}
