export const CONTRACT_ADDRESS = "0x6346431AF4dAB820764433112D66a4E0B695dC9D"; // Update with deployed contract address

export const CONTRACT_ABI = [
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
  }
];
