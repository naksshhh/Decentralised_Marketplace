const axios = require("axios");
require("dotenv").config();

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

// Function to upload JSON data to Pinata IPFS
async function uploadToIPFS(data) {
  try {
    const response = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", data, {
      headers: {
        "Content-Type": "application/json",
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET_API_KEY
      }
    });

    console.log("Uploaded to IPFS:", response.data);
    return response.data.IpfsHash; // Return IPFS hash
  } catch (error) {
    console.error("IPFS Upload Error:", error.response ? error.response.data : error.message);
    throw new Error("Failed to upload to IPFS");
  }
}

module.exports = { uploadToIPFS };
