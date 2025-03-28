const axios = require('axios');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const CryptoJS = require('crypto-js');

// Generate key pair for testing
const keypair = ec.genKeyPair();
const publicKey = keypair.getPublic('hex');
const privateKey = keypair.getPrivate('hex');

console.log('===== TEST KEY PAIR =====');
console.log('Public Key:', publicKey);
console.log('Private Key:', privateKey);

// Sample dataset and metadata
const sampleData = {
  dataset: 'This is test dataset content from testOnly script',
  price: '1',
  metadata: 'Sample test dataset',
  buyerPublicKey: publicKey
};

// Encryption function (simplified version of the one in the server)
function encryptData(data, pubKey) {
  const key = ec.keyFromPublic(pubKey, 'hex');
  const sharedSecret = key.getPublic().encode('hex').slice(0, 32);
  return CryptoJS.AES.encrypt(data, sharedSecret).toString();
}

// Decryption function
function decryptData(encryptedData, privKey) {
  const key = ec.keyFromPrivate(privKey, 'hex');
  const sharedSecret = key.getPublic().encode('hex').slice(0, 32);
  const bytes = CryptoJS.AES.decrypt(encryptedData, sharedSecret);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Simulate the entire flow locally
console.log('\n===== LOCAL SIMULATION =====');

// 1. Encrypt the dataset
console.log('Encrypting dataset...');
const encryptedDataset = encryptData(sampleData.dataset, publicKey);
console.log('Encrypted dataset:', encryptedDataset.substring(0, 50) + '...');

// 2. Simulate dataset storage (in memory)
const storedDatasets = [
  {
    id: 1,
    ipfsHash: 'QmSimulatedHash1',
    encryptedDataset,
    price: sampleData.price,
    metadata: sampleData.metadata,
    owner: '0xf8b171176f007bc5062c990bcf9280fe968f0796',
    timestamp: new Date().toISOString(),
    buyers: []
  }
];

console.log('\nDataset stored with ID:', storedDatasets[0].id);

// 3. Simulate a purchase
console.log('\nSimulating purchase...');
storedDatasets[0].buyers.push({
  publicKey,
  privateKey, // In a real system, the private key would never be stored
  timestamp: new Date().toISOString()
});
console.log('Purchase recorded for buyer with public key:', publicKey.substring(0, 20) + '...');

// 4. Simulate retrieval
console.log('\nSimulating retrieval...');
const encryptedRetrieved = storedDatasets[0].encryptedDataset;
console.log('Retrieved encrypted data:', encryptedRetrieved.substring(0, 50) + '...');

// 5. Decrypt the dataset
console.log('\nDecrypting dataset...');
try {
  const decryptedDataset = decryptData(encryptedRetrieved, privateKey);
  console.log('Decrypted dataset:', decryptedDataset);
  
  // Verify that the decrypted data matches the original
  console.log('\nVerification - original matches decrypted:', sampleData.dataset === decryptedDataset);
} catch (error) {
  console.error('Decryption failed:', error.message);
}

console.log('\n===== TEST COMPLETE ====='); 