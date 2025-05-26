# Decentralized Marketplace

A fully decentralized data marketplace powered by Ethereum, IPFS, and Proxy Re-Encryption. Designed for secure dataset sharing with verifiable ownership, privacy-preserving encryption, fine-grained access control, and watermarking.

## Project Overview

| Component              | Description                                         |
| ---------------------- | --------------------------------------------------- |
| 🧠 Smart Contracts     | Solidity (Ethereum, EVM-compatible)                 |
| 🔁 Proxy Re-Encryption | Custom elliptic curve implementation (`proxy.js`)   |
| 📦 Backend             | Node.js (Express, Multer, ethers.js)                |
| 🖼️ Frontend            | React + Material UI                                 |
| 📡 IPFS                | For storing encrypted datasets (Pinata API)                      |
| 🖊️ Watermarking        | Deterministic private-key watermarking for metadata (LSB Marking) |


## Key Features

- **Secure peer-to-peer transactions using blockchain**
- **Proxy re-encryption for secure data sharing**
   Encrypt datasets using ephemeral symmetric keys and encapsulate them using elliptic curve PRE. Allows secure buyer-specific access without revealing the owner’s private key.
- **Smart Contract-Based Dataset Registry**
   Upload metadata, IPFS hashes, encrypted capsules, and price to the blockchain.
- **Watermarking for Data Provenance**
   Embed user-specific or public-key-based watermarking directly into metadata to track ownership and prevent unauthorized sharing.
- **Ownership Transfer with Re-Encryption**
   Owners can transfer datasets, re-encrypt capsules using their master key and the new owner's public key.
- **Modern and responsive user interface**

## Prerequisites

* Node.js ≥ 18 and npm
* Ethereum development environment (Hardhat/Ganache/Remix)
* MetaMask browser extension
* Modern web browser (Chrome/Firefox)
* IPFS Node or Web3.Storage

## Installation

1. Clone the repository
2. Install frontend dependencies:
   ```bash
   cd prism-frontend
   npm install
   ```
3. Install backend dependencies:
   ```bash
   cd prism-backend
   npm install
   ```
4. Deploy smart contracts to your Ethereum network

5. Set up environment variables (add these to `.env` in prism-backend directory)
   ```bash
   MONGO_URI=""
   JWT_SECRET=your-secret-key
   ALCHEMY_API_URL= (for the desired blockchain network or testnet)
   PRIVATE_KEY= (from wallet)
   CONTRACT_ADDRESS= (deployed contract address)
   PINATA_API_KEY= (for ipfs connection)
   PINATA_SECRET_API_KEY=
   ```
   (add these to `.env` in prim-frontend directory)
   ```bash 
   REACT_APP_API_URL=http://localhost:5000/api (mostly)
   REACT_APP_CONTRACT_ADDRESS=
   ```



## Running the Application

1. Start the backend server:
   ```bash
   cd prism-backend
   npm start
   ```
   Runs at http://localhost:5000
2. Start the frontend development server:
   ```bash
   cd prism-frontend
   npm start
   ```
3. Open your browser and navigate to `http://localhost:3000`

## Security Features

| Layer                     | Function                                                                        |
| ------------------------- | ------------------------------------------------------------------------------- |
| 🔑 Signature-Derived Keys | Derives deterministic scalar keys from ECDSA signatures.                        |
| 🔒 Symmetric Encryption   | AES-CBC encryption with proxy-encrypted symmetric key capsule.                  |
| 🔁 Capsule Re-Encryption  | Uses re-encryption keys for transforming capsules for each buyer.               |
| 🕵️ Watermarking          | Private-key or user-string based metadata watermarking for ownership claims.    |
| ❌ No Private Key Storage  | All encryption/decryption keys are derived on-the-fly from MetaMask signatures. |

## Future Enhancements
- ZK-based access proofs

- IPFS pinning resilience

- Governance for dataset disputes

- More advanced watermark verification (e.g., fingerprinting)


## References
* https://github.com/swagatikasun/BD-Monetization
* https://github.com/yjjnls/recrypt-js
* Ethereum. (2016). EIP-191: Signed Data Standard. Ethereum Improvement Proposals. https:
//eips.ethereum.org/EIPS/eip-191.
* - Ocean: Decentralized Data market place 
  - Acentrik : web3 data market place
* Cox, I. J., Miller, M. L., Bloom, J. A., Fridrich, J., & Kalker, T. (2007). Digital watermarking
and steganography. Morgan Kaufmann.
* Johnson, D., Menezes, A., & Vanstone, S. (2001). The Elliptic Curve Digital Signature Algorithm
(ECDSA). International Journal of Information Security, 1 (1), 36-63.




## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For any questions or issues, please contact the project contributors.
- [ECODE Samsung: Prism Program](https://github.ecodesamsung.com/?team=Blockchain)
- [Nakshatra Kanchan](https://github.com/Naksshhh) | Sriharshit Trupti | V Rana Bharath | Chirag Garg ~IIT PATNA
- Prof. Raju Halder ~CSE Dept. , IIT Patna
- Special thanks to Elliptic Curve Crypto, Proxy Re-Encryption pioneers, and the Web3 community.

---
