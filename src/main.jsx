import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { useGLTF } from '@react-three/drei'

// Register the Draco GLTF decoder path globally.
// The decoder files (draco_decoder.wasm + draco_wasm_wrapper.js) are
// copied from node_modules/three/examples/jsm/libs/draco/gltf/ into
// public/draco/ by the dracoCopyPlugin in vite.config.js.
// This single call enables Draco decompression for ALL useGLTF() calls.
useGLTF.setDecoderPath('/draco/')

createRoot(document.getElementById('root')).render(<App />)
