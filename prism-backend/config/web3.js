const { ethers } = require("ethers");
require("dotenv").config();

console.log('\n=== Initializing Web3 Configuration ===');
console.log('Environment variables loaded:', {
  ALCHEMY_API_URL: process.env.ALCHEMY_API_URL ? 'Set' : 'Not Set',
  PRIVATE_KEY: process.env.PRIVATE_KEY ? 'Set' : 'Not Set',
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS ? 'Set' : 'Not Set'
});

// Create provider
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_API_URL);
console.log('Provider created successfully');

// Create wallet
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001", provider);
console.log('Wallet created successfully');

// Contract ABI (interface)
const contractABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "_ipfsHash", "type": "string" },
      { "internalType": "uint256", "name": "_price", "type": "uint256" },
      { "internalType": "string", "name": "_metadata", "type": "string" }
    ],
    "name": "uploadDataset",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_datasetId", "type": "uint256" }],
    "name": "purchaseDataset",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_datasetId", "type": "uint256" },
      { "internalType": "string", "name": "_newMetadata", "type": "string" },
      { "internalType": "uint256", "name": "_newPrice", "type": "uint256" }
    ],
    "name": "updateDataset",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_datasetId", "type": "uint256" }],
    "name": "removeDataset",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_datasetId", "type": "uint256" },
      { "internalType": "address", "name": "_user", "type": "address" }
    ],
    "name": "hasAccess",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_datasetId", "type": "uint256" }],
    "name": "getDataset",
    "outputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "string", "name": "ipfsHash", "type": "string" },
      { "internalType": "uint256", "name": "price", "type": "uint256" },
      { "internalType": "bool", "name": "isAvailable", "type": "bool" },
      { "internalType": "string", "name": "metadata", "type": "string" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "internalType": "uint256", "name": "accessCount", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "datasetCounter",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "datasetId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" }
    ],
    "name": "DatasetPurchased",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_datasetId", "type": "uint256" },
      { "internalType": "string", "name": "_watermarkHash", "type": "string" }
    ],
    "name": "addWatermark",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_datasetId", "type": "uint256" },
      { "internalType": "string", "name": "_reEncryptionKey", "type": "string" }
    ],
    "name": "addReEncryptionKey",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "datasetId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "ipfsHash", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "metadata", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "DatasetUploaded",
    "type": "event"
  }
];

// Create contract instance
console.log('\n=== Creating Contract Instance ===');
console.log('Contract address:', process.env.CONTRACT_ADDRESS);
console.log('Contract ABI length:', contractABI.length);
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  contractABI,
  wallet
);
console.log('Contract instance created successfully');
console.log('Contract address:', contract.target);
console.log('Contract interface:', contract.interface.format());

// Test address validation
const testAddress = "0xf8b171176f007bc5062c990bcf9280fe968f0796";
console.log('\n=== Testing Address Validation ===');
console.log('Test address:', testAddress);
try {
  const checksummed = ethers.getAddress(testAddress);
  console.log('Address validation successful:', checksummed);
} catch (error) {
  console.log('Address validation failed:', error.message);
}

// Test event filters
console.log('\n=== Testing Event Filters ===');
try {
  const purchaseFilter = contract.filters.DatasetPurchased(null, testAddress);
  console.log('Purchase filter created successfully:', purchaseFilter);
  const uploadFilter = contract.filters.DatasetUploaded(testAddress);
  console.log('Upload filter created successfully:', uploadFilter);
} catch (error) {
  console.error('Error creating event filters:', error);
}

// Helper function to safely decode contract call results
const safeDecodeResult = (functionName, result) => {
  try {
    return contract.interface.decodeFunctionResult(functionName, result);
  } catch (error) {
    console.error(`Error decoding ${functionName} result:`, error);
    return null;
  }
};

module.exports = {
  provider,
  wallet,
  contract,
  contractABI,
  safeDecodeResult,
  ethers
};
