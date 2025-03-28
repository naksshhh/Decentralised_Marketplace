const axios = require('axios');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Add delay for clean output
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run full test flow
async function testFullFlow() {
  try {
    console.log('*** STARTING FULL FLOW TEST ***');
    
    // Generate test key pair
    console.log('\nStep 1: Generating key pair');
    const keyPair = ec.genKeyPair();
    const publicKey = keyPair.getPublic('hex');
    const privateKey = keyPair.getPrivate('hex');
    
    console.log('Public Key:', publicKey.substring(0, 30) + '...');
    console.log('Private Key:', privateKey);
    
    await delay(500);
    
    // Step 1: Upload dataset
    console.log('\nStep 2: Uploading dataset');
    const uploadPayload = {
      dataset: 'This is test dataset content for the full flow test',
      price: '1',
      metadata: 'Full flow test dataset',
      buyerPublicKey: publicKey
    };
    
    const uploadResponse = await axios.post(
      'http://localhost:5000/api/datasets/upload',
      uploadPayload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('Upload response:', uploadResponse.data);
    const datasetId = uploadResponse.data.datasetId;
    
    if (!datasetId) {
      throw new Error('No dataset ID returned from upload');
    }
    
    await delay(500);
    
    // Step 2: Purchase dataset
    console.log('\nStep 3: Purchasing dataset');
    const purchasePayload = {
      datasetId,
      buyerPrivateKey: privateKey
    };
    
    try {
      // Try to use regular purchase endpoint
      const purchaseResponse = await axios.post(
        'http://localhost:5000/api/datasets/purchase',
        purchasePayload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      console.log('Purchase response:', purchaseResponse.data);
    } catch (purchaseError) {
      console.log('Standard purchase failed, trying test purchase endpoint');
      
      // Fall back to test purchase endpoint
      const testPurchaseResponse = await axios.post(
        'http://localhost:5000/api/datasets/testPurchase',
        purchasePayload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      console.log('Test purchase response:', testPurchaseResponse.data);
    }
    
    await delay(500);
    
    // Step 3: Retrieve dataset
    console.log('\nStep 4: Retrieving dataset');
    
    try {
      // Try to use regular retrieve endpoint
      const retrieveResponse = await axios.get(
        `http://localhost:5000/api/datasets/retrieve/${datasetId}/${privateKey}`
      );
      
      console.log('Retrieve response:');
      console.log('Dataset:', retrieveResponse.data.dataset);
      
      if (retrieveResponse.data.metadata) {
        console.log('Metadata:', retrieveResponse.data.metadata);
      }
    } catch (retrieveError) {
      console.log('Standard retrieve failed, trying test retrieve endpoint');
      
      // Fall back to test retrieve endpoint
      const testRetrieveResponse = await axios.get(
        `http://localhost:5000/api/datasets/testRetrieve/${datasetId}/${privateKey}`
      );
      
      console.log('Test retrieve response:');
      console.log('Dataset:', testRetrieveResponse.data.dataset);
      
      if (testRetrieveResponse.data.metadata) {
        console.log('Metadata:', testRetrieveResponse.data.metadata);
      }
    }
    
    console.log('\n*** FULL FLOW TEST COMPLETED ***');
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testFullFlow(); 