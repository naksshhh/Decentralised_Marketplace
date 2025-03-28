const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const CryptoJS = require('crypto-js');

console.log('Step 1: Starting encryption test');

// Encrypt function
function encrypt(data, pubKey) {
  try {
    // Create a shared secret from the public key
    const key = ec.keyFromPublic(pubKey, 'hex');
    const secret = key.getPublic().encode('hex').substring(0, 32);
    
    // Encrypt using AES
    return CryptoJS.AES.encrypt(data, secret).toString();
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw error;
  }
}

// Decrypt function
function decrypt(encryptedData, privKey) {
  try {
    // Create same shared secret from private key
    const key = ec.keyFromPrivate(privKey, 'hex');
    const secret = key.getPublic().encode('hex').substring(0, 32);
    
    // Decrypt using AES
    const bytes = CryptoJS.AES.decrypt(encryptedData, secret);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw error;
  }
}

// Add delay for clean console output
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  try {
    console.log('Step 2: Generating key pair');
    
    // Create a new key pair
    const keyPair = ec.genKeyPair();
    const publicKey = keyPair.getPublic('hex');
    const privateKey = keyPair.getPrivate('hex');
    
    console.log('Generated Key Pair:');
    console.log('- Public Key:', publicKey.substring(0, 40) + '...');
    console.log('- Private Key:', privateKey);
    
    await delay(500);
    
    // Original data to encrypt
    const originalData = 'This is a test message to encrypt and decrypt';
    console.log('\nStep 3: Original data:', originalData);
    
    await delay(500);
    
    // Encrypt the data
    console.log('\nStep 4: Encrypting data...');
    const encryptedData = encrypt(originalData, publicKey);
    console.log('Encrypted data:', encryptedData);
    
    await delay(500);
    
    // Decrypt the data
    console.log('\nStep 5: Decrypting data...');
    const decryptedData = decrypt(encryptedData, privateKey);
    console.log('Decrypted data:', decryptedData);
    
    await delay(500);
    
    // Verify the result
    const success = originalData === decryptedData;
    console.log('\nStep 6: Verification:', success ? 'SUCCESS' : 'FAILURE');
    
    if (!success) {
      console.error('Decrypted data does not match original');
      process.exit(1);
    }
    
    await delay(500);
    console.log('\nStep 7: Encryption test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest(); 