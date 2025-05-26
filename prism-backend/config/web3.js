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
  [
      {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "datasetId",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "buyer",
            "type": "address"
          }
        ],
        "name": "CapsuleTransformed",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "datasetId",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "price",
            "type": "uint256"
          }
        ],
        "name": "DatasetListed",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "datasetId",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "buyer",
            "type": "address"
          }
        ],
        "name": "DatasetPurchased",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "datasetId",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "string",
            "name": "reEncryptionKey",
            "type": "string"
          }
        ],
        "name": "DatasetReEncrypted",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "datasetId",
            "type": "uint256"
          }
        ],
        "name": "DatasetRemoved",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "datasetId",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "string",
            "name": "newMetadata",
            "type": "string"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "newPrice",
            "type": "uint256"
          }
        ],
        "name": "DatasetUpdated",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "datasetId",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "string",
            "name": "watermarkHash",
            "type": "string"
          }
        ],
        "name": "DatasetWatermarked",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "datasetId",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "previousOwner",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_datasetId",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "_reEncryptionKey",
            "type": "string"
          }
        ],
        "name": "addReEncryptionKey",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "admin",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "datasetCounter",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "datasets",
        "outputs": [
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "ipfsHash",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "metadata",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "price",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isAvailable",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "accessCount",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "encryptedMasterKey",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "reEncryptionKey",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "isReEncrypted",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_datasetId",
            "type": "uint256"
          }
        ],
        "name": "getDatasetDetails",
        "outputs": [
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "ipfsHash",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "metadata",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "price",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isAvailable",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "accessCount",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "hasPurchased",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "encryptedMasterKey",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "reEncryptionKey",
            "type": "string"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_datasetId",
            "type": "uint256"
          }
        ],
        "name": "getEncryptedMasterKey",
        "outputs": [
          {
            "internalType": "string",
            "name": "",
            "type": "string"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_datasetId",
            "type": "uint256"
          }
        ],
        "name": "getOwnershipHistory",
        "outputs": [
          {
            "internalType": "address[]",
            "name": "",
            "type": "address[]"
          },
          {
            "internalType": "uint256[]",
            "name": "",
            "type": "uint256[]"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_datasetId",
            "type": "uint256"
          }
        ],
        "name": "getTransformedCapsule",
        "outputs": [
          {
            "internalType": "string",
            "name": "",
            "type": "string"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_datasetId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "_user",
            "type": "address"
          }
        ],
        "name": "hasAccess",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_datasetId",
            "type": "uint256"
          }
        ],
        "name": "purchaseDataset",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_datasetId",
            "type": "uint256"
          }
        ],
        "name": "removeDataset",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_datasetId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "_buyer",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "_capsule",
            "type": "string"
          }
        ],
        "name": "storeTransformedCapsule",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_datasetId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_datasetId",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "_metadata",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "_price",
            "type": "uint256"
          }
        ],
        "name": "updateDataset",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "string",
            "name": "_ipfsHash",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "_metadata",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "_encryptedMasterKey",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "_price",
            "type": "uint256"
          }
        ],
        "name": "uploadDataset",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      }
  ]
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
