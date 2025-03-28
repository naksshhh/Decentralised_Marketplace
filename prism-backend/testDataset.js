const axios = require('axios');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Generate new key pair for testing
const keypair = ec.genKeyPair();
const publicKey = keypair.getPublic('hex');
const privateKey = keypair.getPrivate('hex');

let datasetId = null;

// Test dataset upload
async function testDatasetUpload() {
  try {
    console.log('\n===== TESTING DATASET UPLOAD =====');
    console.log('Generated Keys:');
    console.log('Public Key:', publicKey);
    console.log('Private Key:', privateKey);
    
    const payload = {
      dataset: 'This is test dataset content from automated test',
      price: '1',  // Using a whole number for price
      metadata: 'Sample test dataset',
      buyerPublicKey: publicKey
    };
    
    console.log('\nSending upload request...');
    const response = await axios.post('http://localhost:5000/api/datasets/upload', payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Upload response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Store the dataset ID for other tests
    if (response.data.datasetId) {
      datasetId = response.data.datasetId;
      console.log('\nDataset uploaded successfully with ID:', datasetId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Upload failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return false;
  }
}

// Test getting dataset count
async function testTotalDatasets() {
  try {
    console.log('\n===== TESTING DATASET COUNT =====');
    const response = await axios.get('http://localhost:5000/api/datasets/totalDatasets');
    console.log('Total datasets:', response.data.totalDatasets);
    return true;
  } catch (error) {
    console.error('Failed to get dataset count:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return false;
  }
}

// Test dataset purchase
async function testDatasetPurchase() {
  if (!datasetId) {
    console.error('No dataset ID available for purchase test');
    return false;
  }
  
  try {
    console.log('\n===== TESTING DATASET PURCHASE =====');
    console.log('Dataset ID:', datasetId);
    console.log('Private Key:', privateKey);
    
    const payload = {
      datasetId,
      buyerPrivateKey: privateKey
    };
    
    console.log('\nSending purchase request...');
    const response = await axios.post(
      'http://localhost:5000/api/datasets/testPurchase', // Use test endpoint
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Purchase response:');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('Purchase failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return false;
  }
}

// Test dataset retrieval
async function testDatasetRetrieval() {
  if (!datasetId) {
    console.error('No dataset ID available for retrieval test');
    return false;
  }
  
  try {
    console.log('\n===== TESTING DATASET RETRIEVAL =====');
    console.log('Dataset ID:', datasetId);
    console.log('Private Key:', privateKey);
    
    const response = await axios.get(`http://localhost:5000/api/datasets/testRetrieve/${datasetId}/${privateKey}`);
    
    console.log('Retrieval response:');
    console.log('Message:', response.data.message);
    console.log('Dataset:', response.data.dataset);
    
    if (response.data.metadata) {
      console.log('Metadata:');
      console.log(JSON.stringify(response.data.metadata, null, 2));
    }
    return true;
  } catch (error) {
    console.error('Retrieval failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return false;
  }
}

// Test access check
async function testAccessCheck() {
  if (!datasetId) {
    console.error('No dataset ID available for access check test');
    return false;
  }
  
  try {
    // Generate an Ethereum address from the private key
    // For simplicity, we'll just use a dummy address
    const dummyAddress = '0x0000000000000000000000000000000000000000';
    
    console.log('\n===== TESTING ACCESS CHECK =====');
    console.log('Dataset ID:', datasetId);
    console.log('Address:', dummyAddress);
    
    const response = await axios.get(`http://localhost:5000/api/datasets/hasAccess/${datasetId}/${dummyAddress}`);
    
    console.log('Access check response:');
    console.log('Has access:', response.data.hasAccess);
    return true;
  } catch (error) {
    console.error('Access check failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return false;
  }
}

// Run all tests in sequence
async function runAllTests() {
  console.log('===== STARTING COMPREHENSIVE DATASET API TESTS =====');
  
  // First, get the total datasets count
  await testTotalDatasets();
  
  // Then upload a new dataset
  const uploadSuccess = await testDatasetUpload();
  if (!uploadSuccess) {
    console.error('Upload test failed, stopping tests');
    return;
  }
  
  // Get the updated dataset count
  await testTotalDatasets();
  
  // Check access (should be false at this point)
  await testAccessCheck();
  
  // Try to purchase the dataset
  const purchaseSuccess = await testDatasetPurchase();
  
  // Try to retrieve the dataset (may fail if purchase failed)
  if (purchaseSuccess) {
    // Check access (should be true if purchase succeeded)
    await testAccessCheck();
    
    // Retrieve the dataset
    await testDatasetRetrieval();
  }
  
  console.log('\n===== TESTS COMPLETED =====');
}

runAllTests(); 