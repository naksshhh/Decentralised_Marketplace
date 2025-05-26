
import { initWeb3 } from '../utils/web3';
import { ethers } from 'ethers';

// API endpoints
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Contract configuration
const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
const contractABI = [
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
];

// Helper function for API calls
export const apiCall = async (endpoint, options = {}) => {
  try {
    // Get auth token from localStorage
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Dataset API methods
export const datasetApi = {
  getAllDatasets: () => apiCall('/datasets'),
  getDataset: (id) => apiCall(`/datasets/${id}`),
  purchaseDataset: async (id, price) => {
    try {
      // Get Web3 instance
      const { provider, signer } = await initWeb3();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      // Get current account
      const address = await signer.getAddress();

      // Convert ETH price to Wei
      const weiPrice = ethers.parseEther(price.toString());

      // Check if user has enough balance
      const balance = await provider.getBalance(address);
      if (balance < weiPrice) {
        throw new Error('Insufficient ETH balance for purchase');
      }
      const message = `I confirm purchase of dataset ${id} at ${new Date().toISOString()}`;
      const signature = await signer.signMessage(message);

      const response = await apiCall(`/datasets/purchase/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          id,
          signature,
          address,
        })
      });

      return response;
    } catch (error) {
      console.error('Purchase failed:', error);
      throw new Error(error.message || 'Failed to purchase dataset');
    }
  },
};

// Transaction API methods
export const transactionApi = {
  getRecentTransactions: () => apiCall('/transactions/recent'),
  getTransaction: (id) => apiCall(`/transactions/${id}`),
  getTransactionsByUser: (userId) => apiCall(`/transactions/user/${userId}`),
  getTransactionHistory: async () => {
    console.log('Starting getTransactionHistory...');
    const { signer } = await initWeb3();
    const address = await signer.getAddress();
    console.log('Original address:', address);
    // Ensure address is checksummed and lowercase
    const formattedAddress = ethers.getAddress(address).toLowerCase();
    console.log('Formatted address:', formattedAddress);
    const url = `/transactions/history?address=${formattedAddress}`;
    console.log('Request URL:', url);
    return apiCall(url);
  }
};

// User API methods
export const userApi = {
  getProfile: () => apiCall('/user/profile'),
  updateProfile: (profile) => apiCall('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  }),
  getPurchases: (address) => apiCall(`/user/purchases?address=${address}`),
  getUploads: () => apiCall('/user/uploads'),
  getOwnedDatasets: async () => {
    console.log('Starting getOwnedDatasets...');
    const { signer } = await initWeb3();
    const address = await signer.getAddress();
    console.log('Original address:', address);
    // Ensure address is checksummed and lowercase
    const formattedAddress = ethers.getAddress(address).toLowerCase();
    console.log('Formatted address:', formattedAddress);
    const url = `/datasets/user/owned?address=${formattedAddress}`;
    console.log('Request URL:', url);
    return apiCall(url);
  },
  getPurchasedDatasets: async () => {
    console.log('Starting getPurchasedDatasets...');
    const { signer } = await initWeb3();
    const address = await signer.getAddress();
    console.log('Original address:', address);
    // Ensure address is checksummed and lowercase
    const formattedAddress = ethers.getAddress(address).toLowerCase();
    console.log('Formatted address:', formattedAddress);
    const url = `/datasets/user/purchased?address=${formattedAddress}`;
    console.log('Request URL:', url);
    return apiCall(url);
  },
  getTransactionHistory: async () => {
    console.log('Starting getTransactionHistory...');
    const { signer } = await initWeb3();
    const address = await signer.getAddress();
    console.log('Original address:', address);
    // Ensure address is checksummed
    const formattedAddress = ethers.getAddress(address);
    console.log('Formatted address:', formattedAddress);
    const url = `/transactions/history?address=${formattedAddress}`;
    console.log('Request URL:', url);
    return apiCall(url);
  },
  getProfileStats: async () => {
    const { signer } = await initWeb3();
    const address = await signer.getAddress();
    return apiCall(`/user/stats?address=${address}`);
  },
}; 