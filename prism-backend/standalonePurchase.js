const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const CryptoJS = require('crypto-js');

console.log('*** STANDALONE PURCHASE SIMULATION ***');

// Generate key pair
const keyPair = ec.genKeyPair();
const publicKey = keyPair.getPublic('hex');
const privateKey = keyPair.getPrivate('hex');

console.log('\nGenerated Key Pair:');
console.log('Public Key:', publicKey.substring(0, 40) + '...');
console.log('Private Key:', privateKey);

// Original dataset
const originalData = 'This is a test dataset for standalone purchase simulation';
console.log('\nOriginal dataset:', originalData);

// Encrypt function
function encrypt(data, pubKey) {
  const key = ec.keyFromPublic(pubKey, 'hex');
  const secret = key.getPublic().encode('hex').substring(0, 32);
  return CryptoJS.AES.encrypt(data, secret).toString();
}

// Decrypt function
function decrypt(encryptedData, privKey) {
  const key = ec.keyFromPrivate(privKey, 'hex');
  const secret = key.getPublic().encode('hex').substring(0, 32);
  const bytes = CryptoJS.AES.decrypt(encryptedData, secret);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// 1. Encrypt the dataset (simulates upload)
console.log('\nEncrypting dataset...');
const encryptedData = encrypt(originalData, publicKey);
console.log('Encrypted data:', encryptedData.substring(0, 50) + '...');

// 2. Store the encrypted data (simulates blockchain storage)
console.log('\nStoring encrypted data...');
const datasetId = Math.floor(Math.random() * 1000) + 1;
console.log('Assigned Dataset ID:', datasetId);

// 3. Retrieve the encrypted data (simulates blockchain retrieval)
console.log('\nRetrieving encrypted data...');
const retrievedData = encryptedData;

// 4. Decrypt the data (simulates dataset retrieval)
console.log('\nDecrypting dataset with private key...');
const decryptedData = decrypt(retrievedData, privateKey);
console.log('Decrypted data:', decryptedData);

// Verify decryption worked
console.log('\nVerification - original matches decrypted:', originalData === decryptedData);

console.log('\n*** SIMULATION COMPLETE ***'); 