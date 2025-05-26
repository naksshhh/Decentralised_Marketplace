const axios = require('axios');

// Use the datasetId and privateKey from the previous purchase test
const datasetId = '12'; // Update this with the dataset ID from your purchase test
const privateKey = '33944fbd5c710031dd0f6a7f64c6c0038840c911f66e0edb430bc57282fd496a'; // Update this with the private key from your purchase test

async function retrieveTest() {
  try {
    console.log('===== DATASET RETRIEVAL TEST =====');
    console.log('Dataset ID:', datasetId);
    console.log('Private Key:', privateKey.substring(0, 10) + '...');
    
    // First try the regular retrieve endpoint
    console.log('\nStep 1: Trying regular retrieve endpoint...');
    try {
      const retrieveResponse = await axios.get(
        `http://localhost:5000/api/datasets/retrieve/${datasetId}/${privateKey}`
      );
      
      console.log('Retrieval successful:');
      console.log('Message:', retrieveResponse.data.message);
      console.log('Dataset:', retrieveResponse.data.dataset);
      
      if (retrieveResponse.data.metadata) {
        console.log('Metadata:', retrieveResponse.data.metadata);
      }
    } catch (retrieveError) {
      console.error('Regular retrieve failed:', retrieveError.message);
      
      if (retrieveError.response) {
        console.error('Error details:', retrieveError.response.data);
        console.error('Status code:', retrieveError.response.status);
      }
      
      // Try the test retrieve endpoint as fallback
      console.log('\nStep 2: Trying test retrieve endpoint...');
      try {
        const testRetrieveResponse = await axios.get(
          `http://localhost:5000/api/datasets/testRetrieve/${datasetId}/${privateKey}`
        );
        
        console.log('Test retrieval successful:');
        console.log('Message:', testRetrieveResponse.data.message);
        console.log('Dataset:', testRetrieveResponse.data.dataset);
        
        if (testRetrieveResponse.data.metadata) {
          console.log('Metadata:', testRetrieveResponse.data.metadata);
        }
      } catch (testError) {
        console.error('Test retrieve also failed:', testError.message);
        
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

retrieveTest(); 