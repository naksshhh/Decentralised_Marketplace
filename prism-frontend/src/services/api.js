import { getWeb3 } from '../utils/web3';
import BN from 'bn.js';
import { toWei } from 'web3-utils';
import { initWeb3 } from '../utils/web3';
import { ethers } from 'ethers';

// API endpoints
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Contract configuration
const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
const contractABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
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
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "getDataset",
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
        "internalType": "string",
        "name": "metadata",
        "type": "string"
      }
    ],
    "stateMutability": "view",
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

      // Send transaction
      const tx = await contract.purchaseDataset(id, { value: weiPrice });
      await tx.wait();

      // After successful transaction, notify the backend
      const response = await apiCall(`/datasets/purchase/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          price,
          buyerPublicKey: address,
          transactionHash: tx.hash
        })
      });

      return response;
    } catch (error) {
      console.error('Purchase failed:', error);
      throw new Error(error.message || 'Failed to purchase dataset');
    }
  },
  uploadDataset: async (dataset) => {
    return apiCall('/datasets', {
      method: 'POST',
      body: JSON.stringify(dataset),
    });
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