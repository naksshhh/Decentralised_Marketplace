const axios = require('axios');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Generate a new key pair
const keypair = ec.genKeyPair();
const publicKey = keypair.getPublic('hex');
const privateKey = keypair.getPrivate('hex');

console.log('Generated Keys:');
console.log('Public Key:', publicKey);
console.log('Private Key:', privateKey);

// Test dataset upload
async function testDatasetUpload() {
  try {
    console.log('\nTesting dataset upload...');
    
    const payload = {
      dataset: 'This is test dataset content from automated test',
      price: '1',  // Changed to a whole number which is easier to handle
      metadata: 'Sample test dataset',
      buyerPublicKey: publicKey
    };
    
    console.log('Using public key:', publicKey);
    console.log('Public key valid:', publicKey.startsWith('04'));
    console.log('Public key length:', publicKey.length);
    
    const response = await axios.post('http://localhost:5000/api/datasets/upload', payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Upload response:', response.data);
    
    // If the upload was successful and we have a datasetId, store it for later testing
    if (response.data.datasetId) {
      console.log('\nDataset uploaded successfully with ID:', response.data.datasetId);
      
      // We could add code here to test the retrieve endpoint using this datasetId
    }
  } catch (error) {
    console.error('Upload failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testDatasetUpload(); 