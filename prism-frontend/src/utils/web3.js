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
    "name": "datasetCounter",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
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
    "inputs": [
      { "internalType": "uint256", "name": "_datasetId", "type": "uint256" },
      { "internalType": "address", "name": "_user", "type": "address" }
    ],
    "name": "hasAccess",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
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

