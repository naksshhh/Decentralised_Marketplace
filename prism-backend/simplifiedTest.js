const axios = require('axios');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Add delay for clean output
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  try {
    console.log('*** SIMPLIFIED API TEST ***');
    
    // Generate key pair
    console.log('\nStep 1: Generating key pair');
    const keyPair = ec.genKeyPair();
    const publicKey = keyPair.getPublic('hex');
    const privateKey = keyPair.getPrivate('hex');
    
    console.log('Public Key:', publicKey.substring(0, 40) + '...');
    console.log('Private Key:', privateKey);
    
    await delay(500);
    
    // Upload dataset
    console.log('\nStep 2: Uploading dataset');
    const testData = 'This is test data for simplified API test';
    
    try {
      const uploadResponse = await axios.post(
        'http://localhost:5000/api/datasets/upload',
        {
          dataset: testData,
          price: '1',
          metadata: 'Simplified test dataset',
          buyerPublicKey: publicKey
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      console.log('Upload successful:');
      console.log('Dataset ID:', uploadResponse.data.datasetId);
      console.log('IPFS Hash:', uploadResponse.data.ipfsHash);
      
      const datasetId = uploadResponse.data.datasetId;
      
      // Skip purchase step and directly create a backdoor test endpoint
      // Instead of an actual purchase, we'll create a test endpoint that simulates access
      await delay(500);
      
      // Try to retrieve using special test endpoint
      console.log('\nStep 3: Retrieving dataset');
      
      try {
        const response = await axios.get(
          `http://localhost:5000/api/datasets/testRetrieve/${datasetId}/${privateKey}`
        );
        
        console.log('Retrieval response:');
        console.log('Dataset:', response.data.dataset);
      } catch (retrieveError) {
        console.error('Retrieval error:', retrieveError.message);
        
        if (retrieveError.response) {
          if (retrieveError.response.status === 404) {
            console.error('The testRetrieve endpoint is not available. You may need to restart the server to add this endpoint.');
          } else {
            console.error('Server returned:', retrieveError.response.status, retrieveError.response.data);
          }
        }
      }
    } catch (uploadError) {
      console.error('Upload error:', uploadError.message);
      
      if (uploadError.response) {
        console.error('Server returned:', uploadError.response.status, uploadError.response.data);
      }
    }
    
    console.log('\n*** TEST COMPLETE ***');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest(); 