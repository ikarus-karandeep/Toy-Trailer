const { NodeIO } = require('@gltf-transform/core');

async function checkGLB(filePath) {
    const io = new NodeIO();
    try {
        const document = await io.read(filePath);
        const root = document.getRoot();
        console.log(`\nMeshes in ${filePath}:`);
        root.listMeshes().forEach(mesh => {
            console.log(' - ' + mesh.getName());
        });
        console.log(`\nNodes in ${filePath}:`);
        root.listNodes().forEach(node => {
            const name = node.getName();
            if (name) console.log(' - ' + name);
        });
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e.message);
    }
}

async function run() {
    await checkGLB('c:/Ikarus/Toy-trailers/public/models/Structure/Axle Configs.glb');
    await checkGLB('c:/Ikarus/Toy-trailers/public/models/Structure/Axle.glb');
    await checkGLB('c:/Ikarus/Toy-trailers/public/models/Structure/Wheels.glb');
}

run();
