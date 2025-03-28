const axios = require('axios');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Generate keys for testing
const keyPair = ec.genKeyPair();
const publicKey = keyPair.getPublic('hex');
const privateKey = keyPair.getPrivate('hex');

async function purchaseTest() {
  try {
    console.log('===== DATASET PURCHASE TEST =====');
    console.log('Using test keys:');
    console.log('Public key:', publicKey.substring(0, 30) + '...');
    console.log('Private key:', privateKey);
    
    // Step 1: First upload a dataset to get an ID
    console.log('\nStep 1: Uploading a test dataset...');
    const uploadResponse = await axios.post(
      'http://localhost:5000/api/datasets/upload',
      {
        dataset: 'Test dataset for purchase test',
        price: '0.01', 
        metadata: 'Purchase test dataset',
        buyerPublicKey: publicKey
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('Upload response:', uploadResponse.data);
    const datasetId = uploadResponse.data.datasetId;
    
    if (!datasetId) {
      throw new Error('No dataset ID received from upload');
    }
    
    // Step 2: Purchase the dataset
    console.log('\nStep 2: Purchasing dataset with ID:', datasetId);
    
    try {
      // Try the regular purchase endpoint
      const purchaseResponse = await axios.post(
        'http://localhost:5000/api/datasets/purchase',
        {
          datasetId,
          buyerPrivateKey: privateKey
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      console.log('Purchase successful:');
      console.log(purchaseResponse.data);
    } catch (purchaseError) {
      console.error('Regular purchase failed:', purchaseError.message);
      
      if (purchaseError.response) {
        console.error('Error details:', purchaseError.response.data);
        console.error('Status code:', purchaseError.response.status);
      }
      
      // Try the test purchase endpoint as fallback
      console.log('\nTrying test purchase endpoint...');
      try {
        const testPurchaseResponse = await axios.post(
          'http://localhost:5000/api/datasets/testPurchase',
          {
            datasetId,
            buyerPrivateKey: privateKey
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        console.log('Test purchase successful:');
        console.log(testPurchaseResponse.data);
      } catch (testError) {
        console.error('Test purchase also failed:', testError.message);
        
        if (testError.response) {
          console.error('Error details:', testError.response.data);
          console.error('Status code:', testError.response.status);
        }
      }
    }
    
    console.log('\n===== TEST COMPLETE =====');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

purchaseTest(); 