import React, { useEffect, useState } from "react";
import { connectWallet, fetchDatasets, retrieveDataset } from "../utils/web3";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../utils/constants";
import { ethers } from "ethers";
import axios from "axios";

function DatasetList() {
  const [datasets, setDatasets] = useState([]);
  const [account, setAccount] = useState("");

  useEffect(() => {
    async function loadDatasets() {
      const data = await fetchDatasets();
      setDatasets(data);
    }
    loadDatasets();
  }, []);

  async function handleConnect() {
    const { signer } = await connectWallet();
    setAccount(await signer.getAddress());
  }

  async function handleUpload() {
    if (!dataset || !price || !metadata || !buyerPublicKey) {
      alert("Please fill all fields");
      return;
    }
  
    const formData = new FormData();
    formData.append("dataset", dataset);
    formData.append("price", price.toString());
    formData.append("metadata", metadata);
    formData.append("buyerPublicKey", buyerPublicKey);
  
    const watermarkResult = await axios.post('/api/security/watermark', formData);
    const { watermarkHash } = watermarkResult.data;
  
    const encryptResult = await axios.post('/api/security/encrypt', formData, {
      data: { publicKey: ownerPublicKey }
    });
  
    const response = await fetch("http://localhost:5000/api/datasets/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset,
        price: price.toString(),
        metadata,
        buyerPublicKey,
        watermarkHash,
        reEncryptionKey: encryptResult.data.reEncryptionKey
      }),
    });
  
    const result = await response.json();
    if (result.error) {
      alert("Upload failed: " + result.error);
    } else {
      alert("Dataset uploaded successfully! IPFS Hash: " + result.ipfsHash);
    }
  }
  

  async function buyDataset(datasetId, price) {
    const { provider, signer } = await connectWallet();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    try {
      const tx = await contract.purchaseDataset(datasetId, { value: ethers.parseEther(price) });
      await tx.wait();
      alert("Purchase Successful! Transaction Hash: " + tx.hash);

      // 2. Generate re-encryption key
      const reEncryptResult = await axios.post('/api/security/generate-re-encryption-key', {
        privateKey: ownerPrivateKey,
        publicKey: buyerPublicKey
      });

      // 3. Re-encrypt data
      const reEncryptData = await axios.post('/api/security/re-encrypt', {
        file: encryptedData,
        reEncryptionKey: reEncryptResult.data.reEncryptionKey
      });

      // 4. Decrypt data
      const decryptedData = await axios.post('/api/security/decrypt', {
        file: reEncryptedData,
        privateKey: buyerPrivateKey
      });
    } catch (error) {
      console.error("Purchase failed:", error);
      alert("Error: " + error.message);
    }
  }

  async function viewDataset(datasetId) {
    try {
      const datasetURL = await retrieveDataset(datasetId, account);
      window.open(datasetURL, "_blank");
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div>
      <button onClick={handleConnect}>Connect Wallet</button>
      {account && <p>Connected: {account}</p>}
      <h2>Available Datasets</h2>
      {datasets.length === 0 ? (
        <p>No datasets available</p>
      ) : (
        <ul>
          {datasets.map((dataset) => (
            <li key={dataset.id}>
              <strong>{dataset.metadata}</strong> - {dataset.price} ETH
              <button onClick={() => buyDataset(dataset.id, dataset.price)}>Buy</button>
              <button onClick={() => viewDataset(dataset.id)}>View</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DatasetList;
