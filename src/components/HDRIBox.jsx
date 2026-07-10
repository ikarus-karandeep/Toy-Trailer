import React, { useMemo } from 'react'
import { useThree, useLoader } from '@react-three/fiber'
import { useEnvironment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

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

  gl_FragColor = texture2D(envMap, uv);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const uvVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const uvFragmentShader = `
uniform sampler2D reprojectedMap;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(reprojectedMap, vUv);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function HDRIBox({ environment, size = 150, height = 1.5, envRotation = 0, envOffset = [0, 0], scale = 1.0, modelPath = null, position = [0, 0, 0], reprojectedTexture = null }) {
  if (reprojectedTexture && modelPath) {
    return <UVTextureMesh url={modelPath} texturePath={reprojectedTexture} position={position} />
  }
  return (
    <EnvironmentHDRIBox
      environment={environment}
      size={size}
      height={height}
      envRotation={envRotation}
      envOffset={envOffset}
      scale={scale}
      modelPath={modelPath}
      position={position}
    />
  )
}

function EnvironmentHDRIBox({ environment, size, height, envRotation, envOffset, scale, modelPath, position }) {
  const { gl } = useThree()

  const isHdr = environment?.endsWith('.hdr') || environment?.endsWith('.exr')
  const texture = useEnvironment(isHdr ? { files: environment } : { preset: environment })

  const material = useMemo(() => {
    if (!texture) return null

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
      depthWrite: false,
    })

    return mat
  }, [texture, gl, height, envRotation, envOffset, scale])

  if (!material) return null

  if (modelPath) {
    return <CustomHDRIMesh url={modelPath} material={material} position={position} />
  }

  return (
    <group position={[position[0], size / 2 + position[1], position[2]]}>
      <mesh material={material} layers={1}>
        <boxGeometry args={[size, size, size]} />
      </mesh>
      {/* Invisible shadow receiver */}
      <mesh receiveShadow>
        <shadowMaterial transparent opacity={0.65} depthWrite={false} side={THREE.DoubleSide} />
        <boxGeometry args={[size, size, size]} />
      </mesh>
    </group>
  )
}

function UVTextureMesh({ url, texturePath, position }) {
  const { scene } = useGLTF(url)
  const texture = useLoader(EXRLoader, texturePath)

  const material = useMemo(() => {
    if (!texture) return null
    texture.needsUpdate = true
    return new THREE.ShaderMaterial({
      vertexShader: uvVertexShader,
      fragmentShader: uvFragmentShader,
      uniforms: {
        reprojectedMap: { value: texture }
      },
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  }, [texture])

  const clonedScene = useMemo(() => {
    if (!material) return null
    const clone = scene.clone()
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = material
        child.layers.enable(1)
      }
    })
    return clone
  }, [scene, material])

  const shadowScene = useMemo(() => {
    const clone = scene.clone()
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.65, depthWrite: false, side: THREE.DoubleSide })
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = shadowMat
        child.receiveShadow = true
      }
    })
    return clone
  }, [scene])

  if (!clonedScene) return null
  return (
    <group position={position}>
      <primitive object={clonedScene} />
      <primitive object={shadowScene} />
    </group>
  )
}

function CustomHDRIMesh({ url, material, position }) {
  const { scene } = useGLTF(url)

  const clonedScene = useMemo(() => {
    const clone = scene.clone()
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = material
        child.layers.enable(1)
      }
    })
    return clone
  }, [scene, material])

  const shadowScene = useMemo(() => {
    const clone = scene.clone()
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.65, depthWrite: false, side: THREE.DoubleSide })
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = shadowMat
        child.receiveShadow = true
      }
    })
    return clone
  }, [scene])

  return (
    <group position={position}>
      <primitive object={clonedScene} />
      <primitive object={shadowScene} />
    </group>
  )
}
