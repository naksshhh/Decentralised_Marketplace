import { ethers } from 'ethers';

let provider;
let signer;

const initWeb3 = async () => {
  // Check if MetaMask is installed
  if (typeof window.ethereum !== 'undefined') {
    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      return { provider, signer };
    } catch (error) {
      console.error('User denied account access:', error);
      throw new Error('Please allow access to your account to use this feature.');
    }
  } else {
    throw new Error('Please install MetaMask to use this feature.');
  }
};

const getWeb3 = () => {
  if (!provider || !signer) {
    throw new Error('Web3 is not initialized. Please call initWeb3 first.');
  }
  return { provider, signer };
};

// Smart contract details
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const CONTRACT_ABI = [
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

export async function fetchDatasets() {
  const { provider } = getWeb3();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  try {
    const datasetCounter = await contract.datasetCounter();
    console.log("Total datasets:", datasetCounter);

    const datasets = [];
    for (let i = 1; i <= datasetCounter; i++) {
      const dataset = await contract.getDataset(i);
      datasets.push({
        id: i,
        owner: dataset[0],
        ipfsHash: dataset[1],
        price: ethers.formatEther(dataset[2]),
        isAvailable: dataset[3],
        metadata: dataset[4],
        timestamp: new Date(Number(dataset[5]) * 1000).toLocaleString(),
        accessCount: dataset[6]
      });
    }

    return datasets;
  } catch (error) {
    console.error("Error fetching datasets:", error);
    return [];
  }
}

export async function hasAccess(datasetId, userAddress) {
  const { provider } = getWeb3();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  return await contract.hasAccess(datasetId, userAddress);
}

export async function retrieveDataset(datasetId, userAddress) {
  if (!(await hasAccess(datasetId, userAddress))) {
    throw new Error("Access Denied! You have not purchased this dataset.");
  }
  
  const { provider } = getWeb3();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  const dataset = await contract.getDataset(datasetId);
  
  // IPFS gateways to try in order
  const ipfsGateways = [
    `https://ipfs.io/ipfs/${dataset[1]}`,
    `https://gateway.ipfs.io/ipfs/${dataset[1]}`,
    `https://cloudflare-ipfs.com/ipfs/${dataset[1]}`,
    `https://dweb.link/ipfs/${dataset[1]}`
  ];

  let data;
  let lastError;

  // Try each gateway until one works
  for (const gateway of ipfsGateways) {
    try {
      console.log(`Trying IPFS gateway: ${gateway}`);
      const response = await fetch(gateway);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      data = await response.json();
      console.log('Raw IPFS data:', data);
      break;
    } catch (error) {
      console.error(`Failed to fetch from ${gateway}:`, error);
      lastError = error;
    }
  }

  if (!data) {
    throw new Error(`Failed to fetch dataset from IPFS: ${lastError?.message || 'Unknown error'}`);
  }

  // Return the data in the format expected by the re-encryption service
  return {
    url: ipfsGateways[0],
    encryptedData: JSON.stringify({
      key: data.key,
      cipher: data.cipher
    })
  };
}

export { initWeb3, getWeb3 };

