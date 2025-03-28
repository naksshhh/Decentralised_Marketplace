const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_API_URL);

async function checkBalance() {
  const balance = await provider.getBalance("0xF8B171176f007bc5062C990bCf9280fE968f0796");
  console.log("Balance:", ethers.formatEther(balance), "ETH");
}

checkBalance();
