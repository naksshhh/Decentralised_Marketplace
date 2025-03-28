const { ethers } = require("ethers");
require("dotenv").config();

// Get the contract ABI from web3.js
const web3Config = require('./config/web3');
const contractABI = web3Config.contract.interface.fragments;

async function main() {
    try {
        // Create provider and wallet
        const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_API_URL);
        console.log("Network:", await provider.getNetwork());
        
        // Check if we have a private key
        if (!process.env.PRIVATE_KEY) {
            console.error("ERROR: PRIVATE_KEY not set in .env file");
            return;
        }

        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const address = await wallet.getAddress();
        console.log("Wallet address:", address);
        
        const balance = await provider.getBalance(address);
        console.log("Balance:", ethers.formatEther(balance), "ETH");
        
        if (balance === 0n) {
            console.error("ERROR: Wallet has zero balance. Please fund this address to deploy contracts.");
            return;
        }
        
        // Check if we already have a contract
        if (process.env.CONTRACT_ADDRESS) {
            console.log("Current contract address from .env:", process.env.CONTRACT_ADDRESS);
            try {
                const code = await provider.getCode(process.env.CONTRACT_ADDRESS);
                console.log("Code exists at address:", code !== "0x");
                console.log("Code length:", code.length);
                
                // Try to call datasetCounter using existing contract from web3.js
                try {
                    const counter = await web3Config.contract.datasetCounter();
                    console.log("Dataset counter:", counter.toString());
                } catch (error) {
                    console.error("Failed to call datasetCounter:", error.message);
                }
            } catch (error) {
                console.error("Error checking contract:", error.message);
            }
        } else {
            console.log("No CONTRACT_ADDRESS found in .env file");
        }
        
        // Confirm contract deployment
        const confirmDeploy = process.argv.includes("--deploy");
        if (!confirmDeploy) {
            console.log("\nThis is a dry run. To actually deploy the contract, run:");
            console.log("node deployContract.js --deploy");
            return;
        }
        
        console.log("\nDeploying contract...");
        
        // Placeholder for the contract factory and deployment
        // In a real scenario, you'd need the contract bytecode here
        console.log("To deploy your contract, you need to:");
        console.log("1. Get the contract bytecode from a compiled Solidity file");
        console.log("2. Use a ContractFactory to deploy it:");
        console.log("   const factory = new ethers.ContractFactory(contractABI, bytecode, wallet);");
        console.log("   const contract = await factory.deploy();");
        console.log("   await contract.deployed();");
        console.log("   console.log('Contract deployed to:', contract.address);");
        
    } catch (error) {
        console.error("Deployment failed:", error);
    }
}

main(); 