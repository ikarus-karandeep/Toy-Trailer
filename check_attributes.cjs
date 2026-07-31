const fs = require('fs');
const buffer = fs.readFileSync('public/models/Packaging/Windows.glb');

const magic = buffer.readUInt32LE(0);
const chunkLength = buffer.readUInt32LE(12);
const jsonString = buffer.toString('utf8', 20, 20 + chunkLength);
const gltf = JSON.parse(jsonString);

gltf.meshes.forEach(mesh => {
    console.log(`Mesh: ${mesh.name}`);
    mesh.primitives.forEach(prim => {
        console.log(`Attributes:`, Object.keys(prim.attributes));
    });
});
