const LZString = require('lz-string');

const data = { exteriorFinish: 'blackout' };
const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(data));
console.log("Encoded:", encoded);

// Simulate what the browser does to search string
const searchStr = `?arKey=${encoded}`;

const match = searchStr.match(/[?&]arKey=([^&]+)/);
const raw = match[1];

// Try with decodeURIComponent
const decoded1 = LZString.decompressFromEncodedURIComponent(decodeURIComponent(raw));
console.log("Decoded 1 (with decodeURIComponent):", decoded1);

// Try without decodeURIComponent
const decoded2 = LZString.decompressFromEncodedURIComponent(raw);
console.log("Decoded 2 (without decodeURIComponent):", decoded2);
