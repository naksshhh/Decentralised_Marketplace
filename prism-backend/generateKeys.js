const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Generate a brand new random key pair
function generateKeyPair() {
  const keyPair = ec.genKeyPair();
  
  // Get private key in hex format
  const privateKey = keyPair.getPrivate('hex');
  
  // Get public key in uncompressed format (with 04 prefix)
  const publicKeyUncompressed = keyPair.getPublic('hex');
  
  // Get public key in compressed format (with 02/03 prefix)
  const publicKeyCompressed = keyPair.getPublic(true, 'hex');
  
  return {
    privateKey,
    publicKeyUncompressed,
    publicKeyCompressed,
    // For debugging/info
    privateKeyLength: privateKey.length,
    publicKeyUncompressedLength: publicKeyUncompressed.length,
    publicKeyCompressedLength: publicKeyCompressed.length
  };
}

// Validate an existing key
function validatePublicKey(publicKey) {
  try {
    // Try to load the key
    const key = ec.keyFromPublic(publicKey, 'hex');
    
    // If we get here, the key is valid
    return {
      valid: true,
      message: "Valid key",
      // Create both formats for reference
      uncompressed: key.getPublic('hex'),
      compressed: key.getPublic(true, 'hex')
    };
  } catch (error) {
    return {
      valid: false,
      message: error.message
    };
  }
}

// Generate and display key info
const keyPair = generateKeyPair();
console.log("Generated Keys:");
console.log(JSON.stringify(keyPair, null, 2));

// Try to validate the problematic key
const problemKey = "041b295c79d331c421fdd1320d2f7e5f137790e046401b823e272e0cf08b52da07db5a041a57f291551be164ae664";
console.log("\nValidating problem key:", problemKey);
console.log(JSON.stringify(validatePublicKey(problemKey), null, 2));

// Also create a sample encryption/decryption to test the key
const CryptoJS = require('crypto-js');
try {
  const testData = "This is a test message";
  console.log("\nEncryption Test:");
  console.log("Message:", testData);
  
  // New key pair for testing
  const testKeyPair = ec.genKeyPair();
  const testPublicKey = testKeyPair.getPublic('hex');
  const testPrivateKey = testKeyPair.getPrivate('hex');
  
  // Encrypt with public key
  const encryptKey = ec.keyFromPublic(testPublicKey, 'hex');
  const sharedSecret = encryptKey.getPublic().encode('hex').slice(0, 32);
  const encrypted = CryptoJS.AES.encrypt(testData, sharedSecret).toString();
  
  console.log("Encrypted:", encrypted);
  
  // Decrypt with private key
  const decryptKey = ec.keyFromPrivate(testPrivateKey, 'hex');
  const decryptSharedSecret = decryptKey.getPublic().encode('hex').slice(0, 32);
  const decrypted = CryptoJS.AES.decrypt(encrypted, decryptSharedSecret).toString(CryptoJS.enc.Utf8);
  
  console.log("Decrypted:", decrypted);
  console.log("Success:", testData === decrypted);
} catch (error) {
  console.error("Encryption test failed:", error.message);
}

module.exports = { generateKeyPair, validatePublicKey }; 