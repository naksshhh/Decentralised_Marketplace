const Proxy = require('../proxy re-encryption/src/proxy.js');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Generate a key pair using the Proxy library
const keyPair = Proxy.generate_key_pair();

// Get the private and public keys in hex format
const privateKey = Proxy.to_hex(keyPair.get_private_key().to_bytes());
const publicKey = Proxy.to_hex(keyPair.get_public_key().to_bytes());

// Validate the keys
console.log("Private Key Length:", privateKey.length);
console.log("Public Key Length:", publicKey.length);
console.log("Public Key starts with 04:", publicKey.startsWith('04'));

console.log("\nPrivate Key:", privateKey);
console.log("Public Key:", publicKey);
