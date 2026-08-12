import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs'

/**
 * Inline Vite plugin: copies Draco GLTF decoder files from three.js into
 * public/draco/ so they're served statically and useGLTF can find them.
 */
function dracoCopyPlugin() {
  return {
    name: 'draco-copy',
    buildStart() {
      const src = resolve('node_modules/three/examples/jsm/libs/draco/gltf')
      const dest = resolve('public/draco')
      if (!existsSync(src)) {
        console.warn('[draco-copy] Source not found:', src)
        return
      }
      if (!existsSync(dest)) mkdirSync(dest, { recursive: true })
      for (const file of readdirSync(src)) {
        copyFileSync(resolve(src, file), resolve(dest, file))
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dracoCopyPlugin(),
  ],
})
