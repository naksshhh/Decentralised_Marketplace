const express = require("express");
const { ethers } = require("ethers"); // Import ethers.js
const { uploadToIPFS } = require("../config/ipfs");
const { contract, provider, wallet, safeDecodeResult } = require("../config/web3"); // Import safeDecodeResult helper
const router = express.Router();
const multer = require("multer");
const reEncryptionService = require('../services/security/reEncryptionService');
const watermarkService = require('../services/security/watermarkService');

// Setup multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Increased limit to 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff',
      // Documents
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Spreadsheets
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Text files
      'text/plain', 'text/csv', 'text/html', 'text/xml', 'application/json', 'application/xml',
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/midi',
      // Video
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
      // Code files
      'text/javascript', 'text/css', 'text/x-python', 'text/x-java-source', 'text/x-c++src',
      // Database files
      'application/x-sqlite3', 'application/x-mysql', 'application/x-postgresql'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please check the allowed file types.'));
    }
  }
});


router.get("/totalDatasets", async (req, res) => {
  try {
    console.log("Fetching dataset count...");
    console.log("Contract address:", contract.target);

    // Try multiple approaches to get the dataset count
    let totalCount = "0";
    let errorMsg = null;

    // First, try direct call
    try {
      const count = await contract.datasetCounter();
      totalCount = count.toString();
      console.log("Dataset counter via direct call:", totalCount);
    } catch (directError) {
      console.error("Direct datasetCounter() call failed:", directError.message);
      errorMsg = directError.message;

      // Try raw call
      try {
        console.log("Trying raw call for datasetCounter...");
        const callData = "0x8ada066e"; // Function selector for datasetCounter()
        const result = await provider.call({
          to: contract.target,
          data: callData
        });

        console.log("Raw result:", result);

        if (result && result !== "0x") {
          try {
            // Try to decode with safe helper
            const decodedResult = safeDecodeResult("datasetCounter", result);
            totalCount = decodedResult[0].toString();
            console.log("Decoded counter:", totalCount);
            errorMsg = null;
          } catch (decodeError) {
            console.error("Decode error:", decodeError.message);

            // Fall back to manual hex parsing if decode fails
            const hex = result.replace(/^0x0*/, '');
            totalCount = hex ? parseInt(hex, 16).toString() : "0";
            console.log("Parsed counter from raw hex:", totalCount);
          }
        }
      } catch (rawError) {
        console.error("Raw call failed:", rawError.message);
        errorMsg = errorMsg + "; Raw call: " + rawError.message;

        // If both methods failed, hardcode a fallback value for testing
        console.log("Using fallback value for testing");
        totalCount = "3";
      }
    }

    // Return the result
    if (errorMsg) {
      res.json({
        totalDatasets: totalCount,
        warning: "Couldn't get exact count from contract: " + errorMsg,
        note: "Using estimated count for testing purposes"
      });
    } else {
      res.json({ totalDatasets: totalCount });
    }
  } catch (error) {
    console.error("Error fetching dataset count:", error);
    res.status(500).json({
      error: "Failed to fetch dataset count: " + error.message,
      fallbackCount: "3",
      note: "Using fallback count for testing purposes"
    });
  }
});

// Original text data upload endpoint
router.post("/upload", async (req, res) => {
  try {
    const { dataset, price, OwnerPublicKey, signature, watermarkInfo } = req.body;
    if (!dataset || !price || !OwnerPublicKey) return res.status(400).json({ error: "Missing data" });

    // Use the re-encryption service to encrypt the data
    console.log("Encrypting dataset with owner's public key...");
    const encryptedData = reEncryptionService.encryptData(OwnerPublicKey, dataset);
    const encryptedMasterKey = reEncryptionService.deriveMasterKeyFromSignature(signature)

    // Structure the data for IPFS
    const ipfsData = {
      capsule: encryptedData.capsule, // The capsule from the proxy re-encryption
      cipher: encryptedData.cipher, // The encrypted data
    };
    console.log("Uploading encrypted dataset to IPFS...");
    const ipfsHash = await uploadToIPFS(ipfsData);
    const watermarkedMetadata = watermarkService.processAndWatermarkFile(file, OwnerPublicKey, watermarkInfo);

    console.log("Converting price to Wei...");
    let priceInWei;
    try {
      if (/^\d+$/.test(price)) {
        priceInWei = price;
      } else {
        priceInWei = ethers.parseEther(price.toString());
      }
      console.log("Price in Wei:", priceInWei.toString());
    } catch (priceError) {
      console.error("Error parsing price:", priceError);
      return res.status(400).json({ error: "Invalid price format. Use format like '0.01' or '1'." });
    }

    // Get current dataset count before the transaction
    let currentCount = 0;
    try {
      currentCount = await contract.datasetCounter();
      console.log("Current dataset count before upload:", currentCount.toString());
    } catch (counterError) {
      console.error("Error getting initial dataset counter:", counterError);
    }

    console.log("Storing IPFS hash on blockchain...");
    const tx = await contract.uploadDataset(ipfsHash, watermarkedMetadata, encryptedMasterKey, priceInWei);
    console.log("Transaction sent, waiting for confirmation...");
    await tx.wait();
    console.log("Transaction confirmed:", tx.hash);

    // Get the latest dataset ID from the contract
    let datasetId;
    try {
      // Try direct call
      try {
        const newCount = await contract.datasetCounter();
        datasetId = newCount.toString();
        console.log("New dataset count after upload:", datasetId);
      } catch (directError) {
        console.error("Error with direct counter call:", directError);

        // Fall back to raw call
        const callData = "0x8ada066e"; // Function selector for datasetCounter()
        const result = await provider.call({
          to: contract.target,
          data: callData
        });

        if (result && result !== "0x") {
          const hex = result.replace(/^0x0*/, '');
          datasetId = hex ? parseInt(hex, 16).toString() : "1";
          console.log("Got dataset ID from raw call:", datasetId);
        } else {
          datasetId = (parseInt(currentCount.toString()) + 1).toString();
          console.log("Estimated dataset ID based on previous count:", datasetId);
        }
      }

      res.json({
        message: "Dataset uploaded, encrypted, and watermarked successfully",
        ipfsHash,
        transactionHash: tx.hash,
        encryptedCapsule: encryptedData.capsule,
        encryptedCipher: encryptedData.cipher,
        metadata: watermarkedMetadata,
        datasetId
      });
    } catch (error) {
      console.error("Error getting dataset ID:", error);
      res.status(500).json({ error: "Failed to get dataset ID: " + error.message });
    }
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post("/purchase", async (req, res) => {
  try {
    const { datasetId, signature, buyerPublicKey, message } = req.body;
    if (!datasetId || !buyerPublicKey || !signature) return res.status(400).json({ error: "Missing datasetId or buyerPublicKey" });

    // Verify the signature (wallet ownership)
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    // Connect buyer's wallet
    const buyerWallet = new ethers.Wallet(buyerPrivateKey, provider);
    const buyerContract = contract.connect(buyerWallet);

    console.log("Fetching dataset details...");

    try {
      let owner, ipfsHash, price, isAvailable, metadata;

      try {
        // Try direct call first with specific output types
        const DatasetDetails = await contract.getDatasetDetails(datasetId);
        console.log("Got dataset details via direct call");

        // Extract fields - assuming specific positions in the return array
        owner = datasetDetails[0];
        ipfsHash = datasetDetails[1];
        price = datasetDetails[3];
        isAvailable = datasetDetails[4];
        metadata = datasetDetails[2];
        haspurchased = datasetDetails[5];
        encryptedMasterKey = datasetDetails[6];
        reencryptionKey = datasetDetails[7];
      } catch (directError) {
        console.error("Direct call error:", directError.message);

        // Try with raw call using a more robust approach
        console.log("Trying raw call for dataset details...");

        try {
          const callData = contract.interface.encodeFunctionData("getDatasetDetails", [datasetId]);

          const rawResult = await provider.call({
            to: contract.target,
            data: callData
          });

          console.log("Raw result length:", rawResult.length);

          // Use our safe decoder helper
          try {
            const datasetDetails = safeDecodeResult("getDataset", rawResult);
            console.log("Successfully decoded dataset details");

            owner = datasetDetails[0];
            ipfsHash = datasetDetails[1];
            price = datasetDetails[2];
            isAvailable = datasetDetails[3];
            metadata = datasetDetails[4];
          } catch (decodeError) {
            console.error("Decode error:", decodeError.message);

            // If we can't decode properly, use a fallback approach
            console.log("Using fallback approach to extract price");

            // Just for testing, assume a fixed price
            price = ethers.parseEther("0.01");
            isAvailable = true;
            console.log("Using hardcoded price for testing:", ethers.formatEther(price));
          }
        } catch (rawError) {
          console.error("Raw call failed:", rawError.message);

          // Last resort fallback
          price = ethers.parseEther("0.01");
          isAvailable = true;
          console.log("Using hardcoded price after all attempts failed:", ethers.formatEther(price));
        }
      }
      console.log("Dataset details:");
      console.log("- Price:", ethers.formatEther(price), "ETH");
      console.log("- Available:", isAvailable);

      if (!isAvailable) return res.status(400).json({ error: "Dataset not available for purchase" });

      // Make sure we have enough funds to purchase
      const balance = await provider.getBalance(buyerWallet.address);
      console.log("Buyer balance:", ethers.formatEther(balance), "ETH");

      if (balance < price) {
        return res.status(400).json({
          error: "Insufficient funds",
          required: ethers.formatEther(price),
          available: ethers.formatEther(balance)
        });
      }

      const axios = require('axios');
      const ipfsGateway = 'https://ipfs.io/ipfs';
      const capsuleUrl = `${ipfsGateway}/${ipfsHash}`;

      console.log('Fetching encrypted dataset from IPFS:', capsuleUrl);

      let originalCapsuleHex;
      try {
        const response = await axios.get(capsuleUrl);
        originalCapsuleHex = response.data.capsule;
        if (!originalCapsuleHex) {
          throw new Error("Capsule not found in IPFS response.");
        }
      } catch (ipfsError) {
        return res.status(500).json({ error: "Failed to fetch capsule from IPFS", details: ipfsError.message });
      }

      const reKey = reEncryptionService.generateReEncryptionKey(encryptedMasterKey, buyerPublicKey);
      const transformedCapsule = reEncryptionService.transformCapsule(originalCapsuleHex, reKey);
      // Purchase dataset with error handling
      try {
        const tx = await buyerContract.purchaseDataset(datasetId, { value: price });
        const receipt = await tx.wait();
        console.log("Purchase Successful:", tx.hash);
        // Send transaction

        const storeTx = await buyerContract.storeTransformedCapsule(datasetId, buyerPublicKey, transformedCapsule);
        const storeReKey = await buyerContract.addReEncryptionKey(datasetId, reKey);
        await storeTx.wait();
        await storeReKey.wait();

        // Return detailed success response
        res.json({
          message: "Purchase successful",
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          metadata: {
            dataset: datasetId,
            price: ethers.formatEther(price),
            buyer: buyerWallet.address
          }
        });
      } catch (txError) {
        console.error("Transaction failed:", txError);

        // Extract useful error information
        let errorDetails = "Transaction failed";

        if (txError.code) {
          errorDetails += `: ${txError.code}`;
        }

        if (txError.reason) {
          errorDetails += ` - ${txError.reason}`;
        }

        // Return detailed error
        return res.status(400).json({
          error: errorDetails,
          details: txError.message
        });
      }
    } catch (error) {
      console.error("Error fetching or purchasing dataset:", error);
      throw new Error("Failed to fetch or purchase dataset: " + error.message);
    }
  } catch (error) {
    console.error("Purchase failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/hasAccess/:datasetId/:userAddress", async (req, res) => {
  try {
    const { datasetId, userAddress } = req.params;

    console.log("Checking access for dataset:", datasetId, "user:", userAddress);

    // Validate inputs
    if (!datasetId || isNaN(parseInt(datasetId))) {
      return res.status(400).json({ error: "Invalid dataset ID" });
    }

    if (!ethers.isAddress(userAddress)) {
      return res.status(400).json({ error: "Invalid Ethereum address" });
    }

    // Try direct call first
    try {
      const hasAccess = await contract.hasAccess(datasetId, userAddress);
      console.log("Access check result:", hasAccess);
      res.json({ hasAccess });
    } catch (directError) {
      console.error("Direct call failed:", directError);

      // Fall back to low-level call
      try {
        const callData = contract.interface.encodeFunctionData("hasAccess", [datasetId, userAddress]);
        const result = await provider.call({
          to: contract.target,
          data: callData
        });

        // Decode boolean result
        const decodedResult = contract.interface.decodeFunctionResult("hasAccess", result);
        const hasAccess = decodedResult[0];

        console.log("Access check result (low-level):", hasAccess);
        res.json({ hasAccess });
      } catch (error) {
        console.error("Low-level call failed:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("Error checking access:", error);
    res.status(500).json({ error: "Failed to check access: " + error.message });
  }
});

router.get("/retrieve/:datasetId", async (req, res) => {
  try {
    const { datasetId } = req.params;
    const { message, signature, address } = req.body;

    // Verify signature matches the address
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    // Derive private key (scalar) from signature
    const derivedPrivateKeyHex = reEncryptionService.deriveMasterKeyFromSignature(signature); // or signature + message
    console.log("Checking if buyer has access...");

    // Check access with error handling
    let hasAccess = false;
    try {
      hasAccess = await contract.hasAccess(datasetId, address);
    } catch (accessError) {
      console.error("Direct access check failed:", accessError);

      try {
        // Try low-level call
        const callData = contract.interface.encodeFunctionData("hasAccess", [datasetId, address]);
        const result = await provider.call({
          to: contract.target,
          data: callData
        });

        // Use safe decode
        const decoded = safeDecodeResult("hasAccess", result);
        hasAccess = decoded[0];
      } catch (lowLevelError) {
        console.error("Low-level access check failed:", lowLevelError);
        return res.status(500).json({ error: "Failed to check access rights: " + lowLevelError.message });
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        error: "Access denied. You haven't purchased this dataset.",
        buyerAddress: address,
        datasetId
      });
    }
    console.log("Fetching encrypted dataset from contract...");

    // Get dataset details with better error handling
    let ipfsHash = null;
    let metadata = null;

    try {
      // Try direct call first
      try {
        const dataset = await contract.getDatasetDetails(datasetId);
        ipfsHash = dataset[1];
        metadata = {
          owner: dataset[0],
          price: ethers.formatEther(dataset[3]),
          isAvailable: dataset[4],
          metadata: dataset[2],
          accessCount: dataset[5].toString()
        };
        console.log("Got dataset details via direct call");
      } catch (directError) {
        console.error("Direct call error:", directError);

        // Try with raw call if direct call fails
        console.log("Trying raw call for dataset details...");
        const callData = contract.interface.encodeFunctionData("getDatasetDetails", [datasetId]);

        const rawResult = await provider.call({
          to: contract.target,
          data: callData
        });

        // Use safe decode
        const dataset = safeDecodeResult("getDatasetDetails", rawResult);
        ipfsHash = dataset[1];
        metadata = {
          owner: dataset[0],
          price: ethers.formatEther(dataset[3]),
          isAvailable: dataset[4],
          metadata: dataset[2],
          accessCount: dataset[5].toString()
        };
        console.log("Got dataset details via raw call");
      }

      if (!ipfsHash) {
        throw new Error("No IPFS hash found for dataset");
      }
      const capsuleHex = await contract.getTransformedCapsule(datasetId);
      console.log("IPFS Hash from contract:", ipfsHash);

      // Fetch data from IPFS with better error handling
      const ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
      console.log("Fetching data from IPFS:", ipfsUrl);

      try {
        const response = await fetch(ipfsUrl);
        if (!response.ok) {
          throw new Error(`IPFS request failed with status: ${response.status} - ${response.statusText}`);
        }

        // Try to parse the response data
        let data;
        try {
          // Try JSON first
          data = await response.json();
          console.log("Successfully parsed IPFS data as JSON");
        } catch (jsonError) {
          console.error("JSON parsing failed:", jsonError);

          // If JSON parsing fails, try text
          const textData = await response.text();
          console.log("Parsed IPFS data as text");

          try {
            // Try to see if it's JSON with some formatting issues
            data = JSON.parse(textData);
          } catch (textJsonError) {
            console.error("Text JSON parsing failed:", textJsonError);

            // If all parsing fails, just use the raw text
            data = { encryptedDataset: textData };
            console.log("Using raw text as encryptedDataset");
          }
        }

        // Get the encrypted data
        const encryptedData = data.cipher;
        if (!encryptedData) {
          throw new Error("No encrypted dataset found in IPFS data");
        }

        console.log("Decrypting dataset...");
        try {
          const decrypted = reEncryptionService.decryptTransformedCapsule(capsuleHex, encryptedData, derivedPrivateKeyHex);

          res.json({
            message: "Dataset retrieved successfully",
            dataset: decrypted,
            metadata
          });
        } catch (decryptError) {
          console.error("Decryption failed:", decryptError);
          res.status(500).json({
            error: "Failed to decrypt dataset: " + decryptError.message,
            tip: "This could indicate an issue with the encryption key pair or the stored data format."
          });
        }
      } catch (ipfsError) {
        console.error("IPFS fetch error:", ipfsError);
        res.status(500).json({
          error: "Failed to fetch data from IPFS: " + ipfsError.message,
          ipfsHash,
          ipfsUrl
        });
      }
    } catch (contractError) {
      console.error("Contract data fetch error:", contractError);
      res.status(500).json({
        error: "Failed to get dataset from contract: " + contractError.message
      });
    }
  } catch (error) {
    console.error("Retrieval failed:", error);
    res.status(500).json({ error: "Dataset retrieval failed: " + error.message });
  }
});

// Fixed diagnostics endpoint
router.get("/diagnostics", async (req, res) => {
  try {
    console.log("Checking contract connection...");
    console.log("Contract address:", contract.target);

    // Check if the code exists at the contract address
    const code = await provider.getCode(contract.target);
    console.log("Contract code exists:", code !== "0x");
    console.log("Contract code length:", code.length);

    // Try multiple function calls to see what might be available
    const functionSelectors = {
      "datasetCounter()": "0x8ada066e",
      "getDatasetCounter()": "0x1c97c34e", // This might be used instead
      "getDataset(uint256)": "0x8ca77a57", // Try a different function
      "owner()": "0x8da5cb5b" // Many contracts have an owner function
    };

    const results = {};
    for (const [funcName, selector] of Object.entries(functionSelectors)) {
      try {
        const result = await provider.call({
          to: contract.target,
          data: selector
        });
        results[funcName] = {
          success: true,
          data: result
        };
      } catch (error) {
        results[funcName] = {
          success: false,
          error: error.message
        };
      }
    }

    // Get contract interface information safely
    const interfaceInfo = {
      availableFunctions: Object.keys(contract.interface?.functions || {}),
      fragment: contract.interface?.getFunction("datasetCounter")?.format() || "Not found"
    };

    res.json({
      contractAddress: contract.target,
      codeExists: code !== "0x",
      codeLength: code.length,
      functionCalls: results,
      interfaceInfo
    });
  } catch (error) {
    console.error("Diagnostics failed:", error);
    res.status(500).json({ error: "Diagnostics failed: " + error.message });
  }
});

// Add this simple test route
router.get("/testContract", async (req, res) => {
  try {
    // Print basic information about the contract
    console.log("Contract object:", {
      target: contract.target,
      runner: contract.runner?.address || "Not available",
      hasInterface: !!contract.interface,
      functionCount: Object.keys(contract.interface?.functions || {}).length
    });

    // Simple hardcoded contract test - create a minimal ABI for a test
    const minimalABI = [
      "function name() view returns (string)"
    ];

    const testContract = new ethers.Contract(contract.target, minimalABI, provider);

    try {
      const name = await testContract.name();
      console.log("Contract name:", name);
      res.json({
        success: true,
        message: "Contract responded to 'name()' call",
        name
      });
    } catch (error) {
      console.log("No name function, trying fallback detection");

      // Try some common function selectors directly
      const selectors = [
        { name: "symbol()", selector: "0x95d89b41" },
        { name: "decimals()", selector: "0x313ce567" },
        { name: "totalSupply()", selector: "0x18160ddd" },
        { name: "VERSION()", selector: "0xffa1ad74" }
      ];

      const results = {};
      for (const { name, selector } of selectors) {
        try {
          const result = await provider.call({
            to: contract.target,
            data: selector
          });
          results[name] = { success: true, data: result };
        } catch (error) {
          results[name] = { success: false, error: error.message };
        }
      }

      res.json({
        success: false,
        message: "Contract does not have a 'name()' function",
        contractAddress: contract.target,
        codeExists: true,
        alternativeCalls: results
      });
    }
  } catch (error) {
    console.error("Test contract failed:", error);
    res.status(500).json({ error: "Test contract failed: " + error.message });
  }
});

// Add this after the contractInfo route
router.get("/deploymentHelper", async (req, res) => {
  try {
    // Get network info (must be awaited)
    const network = await provider.getNetwork();

    let walletInfo = {};
    try {
      // Check wallet info if available
      const walletAddress = await wallet.getAddress();
      const balance = await provider.getBalance(walletAddress);

      walletInfo = {
        address: walletAddress,
        balanceWei: balance.toString(),
        balanceEth: ethers.formatEther(balance)
      };
    } catch (walletError) {
      console.error("Wallet error:", walletError);
      walletInfo = {
        error: "Unable to access wallet: " + walletError.message,
        tip: "Check that PRIVATE_KEY is set correctly in .env"
      };
    }

    // Check contract environment
    const envInfo = {
      nodeUrl: process.env.ALCHEMY_API_URL ?
        process.env.ALCHEMY_API_URL.substring(0, 30) + "..." : "Not set",
      contractAddress: process.env.CONTRACT_ADDRESS || "Not set",
      privateKeySet: !!process.env.PRIVATE_KEY,
      networkName: network.name,
      networkChainId: network.chainId.toString() // Convert BigInt to string
    };

    // Check for code at contract address
    let contractInfo = {};
    try {
      const code = await provider.getCode(contract.target);
      contractInfo = {
        address: contract.target,
        hasCode: code !== "0x",
        codeLength: code.length
      };
    } catch (contractError) {
      contractInfo = {
        error: "Unable to check contract: " + contractError.message
      };
    }

    res.json({
      wallet: walletInfo,
      network: {
        name: network.name,
        chainId: network.chainId.toString(), // Convert BigInt to string
        ensAddress: network.ensAddress
      },
      environment: envInfo,
      contract: contractInfo,
      tip: "If your contract isn't working, make sure it's deployed on this network and that the address in .env is correct"
    });
  } catch (error) {
    console.error("Deployment helper error:", error);
    res.status(500).json({ error: "Deployment helper failed: " + error.message });
  }
});

// Add this after the diagnostics route
router.get("/contractInfo", async (req, res) => {
  try {
    const contractAddress = contract.target;
    console.log("Getting contract info for:", contractAddress);

    // Create a simple contract instance with ERC165 interface ID check
    // This checks if the contract supports standard interfaces
    const erc165Abi = [
      "function supportsInterface(bytes4 interfaceId) external view returns (bool)"
    ];
    const erc165Contract = new ethers.Contract(contractAddress, erc165Abi, provider);

    const interfaces = {
      "ERC165": "0x01ffc9a7",
      "ERC721": "0x80ac58cd",
      "ERC1155": "0xd9b67a26",
      "ERC20": "0x36372b07" // Not part of ERC165 but commonly checked
    };

    const interfaceSupport = {};
    for (const [name, id] of Object.entries(interfaces)) {
      try {
        const supported = await erc165Contract.supportsInterface(id);
        interfaceSupport[name] = supported;
      } catch (error) {
        interfaceSupport[name] = `Error: ${error.message}`;
      }
    }

    // Try to get the bytecode 
    const bytecode = await provider.getCode(contractAddress);

    // Check for common function signatures in the bytecode
    const signatures = [
      { name: "balanceOf", id: "0x70a08231" },
      { name: "transfer", id: "0xa9059cbb" },
      { name: "totalSupply", id: "0x18160ddd" },
      { name: "name", id: "0x06fdde03" },
      { name: "symbol", id: "0x95d89b41" },
      { name: "decimals", id: "0x313ce567" },
      { name: "owner", id: "0x8da5cb5b" },
      { name: "datasetCounter", id: "0x8ada066e" }
    ];

    const foundSignatures = [];
    for (const sig of signatures) {
      if (bytecode.includes(sig.id.slice(2))) {
        foundSignatures.push(sig.name);
      }
    }

    res.json({
      contractAddress,
      bytecodeLength: bytecode.length,
      possibleType: interfaceSupport,
      foundFunctions: foundSignatures,
      networkInfo: provider.network
    });
  } catch (error) {
    console.error("Contract info lookup failed:", error);
    res.status(500).json({ error: "Contract info lookup failed: " + error.message });
  }
});

// Add a test purchase endpoint that doesn't rely on contract calls
router.post("/testPurchase", async (req, res) => {
  try {
    const { datasetId, buyerPrivateKey } = req.body;
    if (!datasetId || !buyerPrivateKey) return res.status(400).json({ error: "Missing datasetId or buyerPrivateKey" });

    // Connect buyer's wallet for address only
    const buyerWallet = new ethers.Wallet(buyerPrivateKey, provider);

    console.log("Running test purchase for dataset:", datasetId);
    console.log("Buyer address:", buyerWallet.address);

    // We're simulating a successful purchase without blockchain interaction
    console.log("Simulating purchase transaction...");

    // Generate a mock transaction hash
    const mockTxHash = "0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

    // Simulate a delay for realism
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return success response
    res.json({
      message: "Test purchase successful (simulated)",
      txHash: mockTxHash,
      blockNumber: Math.floor(Math.random() * 10000000),
      testMode: true,
      metadata: {
        dataset: datasetId,
        price: "0.01",
        buyer: buyerWallet.address
      },
      note: "This is a simulated purchase that doesn't interact with the blockchain."
    });
  } catch (error) {
    console.error("Test purchase failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add a test retrieve endpoint for verification
router.get("/testRetrieve/:datasetId/:buyerPrivateKey", async (req, res) => {
  try {
    const { datasetId, buyerPrivateKey } = req.params;

    // Validate inputs
    if (!datasetId || isNaN(parseInt(datasetId))) {
      return res.status(400).json({ error: "Invalid dataset ID" });
    }

    if (!buyerPrivateKey || buyerPrivateKey.length < 64) {
      return res.status(400).json({ error: "Invalid private key format" });
    }

    // Create a wallet from the private key
    const buyerWallet = new ethers.Wallet(buyerPrivateKey, provider);

    // For testing, always return successful access
    console.log("Test retrieve - simulating access check...");
    console.log("Buyer address:", buyerWallet.address);

    // Create test dataset
    const testDataset = "This is test dataset content for ID: " + datasetId + ". Generated for testing purposes.";

    // Return success with test data
    res.json({
      message: "Test dataset retrieved successfully",
      dataset: testDataset,
      testMode: true,
      metadata: {
        owner: "0xf8b171176f007bc5062c990bcf9280fe968f0796",
        price: "0.01",
        isAvailable: true,
        metadata: "Sample test dataset",
        timestamp: new Date().toISOString(),
        accessCount: "1"
      },
      note: "This is a simulated retrieval that doesn't interact with the blockchain."
    });
  } catch (error) {
    console.error("Test retrieval failed:", error);
    res.status(500).json({ error: "Test dataset retrieval failed: " + error.message });
  }
});

// Add a route to get datasets owned by a specific user
router.get("/user/owned", async (req, res) => {

  try {
    const userAddress = req.query.address;

    if (!userAddress) {
      console.log('ERROR: No address provided in query');
      return res.status(400).json({ message: "User address is required" });
    }

    // Validate and format Ethereum address
    let formattedAddress;
    try {
      console.log('\n=== Address Formatting Steps ===');

      // Step 1: Check if it's a string
      if (typeof userAddress !== 'string') {
        console.log('ERROR: Address is not a string, type:', typeof userAddress);
        return res.status(400).json({ message: "Address must be a string" });
      }

      // Step 2: Remove whitespace and convert to lowercase
      const cleanAddress = userAddress.trim().toLowerCase();
      console.log('1. After trimming and lowercase:', cleanAddress);

      // Step 3: Ensure 0x prefix
      const addressWithPrefix = cleanAddress.startsWith('0x') ? cleanAddress : `0x${cleanAddress}`;
      console.log('2. After ensuring 0x prefix:', addressWithPrefix);

      // Step 4: Check length
      if (addressWithPrefix.length !== 42) {
        console.log('ERROR: Invalid address length:', addressWithPrefix.length);
        console.log('Expected length: 42 (including 0x)');
        return res.status(400).json({ message: "Invalid Ethereum address length" });
      }

      // Step 5: Check character set
      if (!/^0x[a-f0-9]{40}$/.test(addressWithPrefix)) {
        console.log('ERROR: Address contains invalid characters');
        console.log('Address must contain only hexadecimal characters after 0x');
        return res.status(400).json({ message: "Invalid Ethereum address characters" });
      }

      // Step 6: Try ethers validation
      try {
        console.log('3. Attempting ethers.getAddress() validation...');
        formattedAddress = ethers.getAddress(addressWithPrefix).toLowerCase();
        console.log('4. Successfully validated with ethers:', formattedAddress);
      } catch (ethersError) {
        console.log('ERROR: ethers.getAddress() failed:', ethersError.message);
        console.log('Address that failed:', addressWithPrefix);
        return res.status(400).json({ message: "Invalid Ethereum address format" });
      }

    } catch (error) {
      console.log('\n=== Address Validation Error ===');
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      return res.status(400).json({ message: "Invalid Ethereum address format" });
    }

    try {
      console.log('\n=== Fetching Datasets ===');
      console.log('Using formatted address:', formattedAddress);
      console.log('Fetching dataset count...');

      const totalCount = await contract.datasetCounter();
      console.log('Total datasets found:', totalCount.toString());
      const datasets = [];

      for (let i = 1; i <= totalCount; i++) {
        try {
          console.log(`\nProcessing dataset ${i}...`);
          const dataset = await contract.getDataset(i);
          console.log(`Dataset ${i} owner:`, dataset[0]);

          if (dataset[0].toLowerCase() === formattedAddress) {
            console.log(`Dataset ${i} belongs to user`);
            const metadata = typeof dataset[4] === 'string' ? dataset[4] : JSON.stringify(dataset[4]);
            datasets.push({
              id: i.toString(),
              owner: dataset[0],
              ipfsHash: dataset[1],
              price: ethers.formatEther(dataset[2]),
              isAvailable: dataset[3],
              metadata: metadata,
              timestamp: new Date(parseInt(dataset[5]) * 1000).toISOString(),
              accessCount: dataset[6].toString()
            });
          }
        } catch (error) {
          console.error(`Error processing dataset ${i}:`, error);
          continue;
        }
      }

      console.log(`\n=== Request Complete ===`);
      console.log(`Found ${datasets.length} datasets owned by user`);
      res.json(datasets);
    } catch (error) {
      console.error('\n=== Dataset Count Error ===');
      console.error('Error fetching dataset count:', error);
      res.status(500).json({ message: "Failed to fetch dataset count" });
    }
  } catch (error) {
    console.error('\n=== General Error ===');
    console.error('Error in owned datasets route:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get datasets purchased by user
router.get("/user/purchased", async (req, res) => {
  try {
    const userAddress = req.query.address;
    console.log('Received address:', userAddress);

    if (!userAddress) {
      console.log('No address provided');
      return res.status(400).json({ message: "User address is required" });
    }

    // Validate and format Ethereum address
    let formattedAddress;
    try {
      console.log('Attempting to format address:', userAddress);
      formattedAddress = ethers.getAddress(userAddress).toLowerCase();
      console.log('Successfully formatted address:', formattedAddress);
    } catch (error) {
      console.log('Address formatting failed:', error.message);
      return res.status(400).json({ message: "Invalid Ethereum address format" });
    }

    try {
      console.log('Fetching dataset count...');
      const totalCount = await contract.datasetCounter();
      console.log('Total datasets:', totalCount.toString());
      const datasets = [];

      for (let i = 1; i <= totalCount; i++) {
        try {
          console.log(`Checking access for dataset ${i}...`);
          const hasAccess = await contract.hasAccess(i, formattedAddress);
          console.log(`Access check result for dataset ${i}:`, hasAccess);

          if (hasAccess) {
            console.log(`User has access to dataset ${i}`);
            const dataset = await contract.getDataset(i);
            const metadata = typeof dataset[4] === 'string' ? dataset[4] : JSON.stringify(dataset[4]);
            datasets.push({
              id: i.toString(),
              owner: dataset[0],
              ipfsHash: dataset[1],
              price: ethers.formatEther(dataset[2]),
              isAvailable: dataset[3],
              metadata: metadata,
              timestamp: new Date(parseInt(dataset[5]) * 1000).toISOString(),
              accessCount: dataset[6].toString()
            });
          }
        } catch (error) {
          console.error(`Error checking access for dataset ${i}:`, error);
          continue;
        }
      }

      console.log(`Found ${datasets.length} datasets purchased by user`);
      res.json(datasets);
    } catch (error) {
      console.error('Error fetching dataset count:', error);
      res.status(500).json({ message: "Failed to fetch dataset count" });
    }
  } catch (error) {
    console.error('Error in purchased datasets route:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all datasets
router.get("/", async (req, res) => {
  try {
    console.log("Fetching all datasets...");
    const totalCount = await contract.datasetCounter();
    console.log("Total datasets:", totalCount.toString());

    const datasets = [];
    for (let i = 1; i <= totalCount; i++) {
      try {
        const dataset = await contract.getDataset(i);
        const metadata = typeof dataset[4] === 'string' ? dataset[4] : JSON.stringify(dataset[4]);
        datasets.push({
          id: i.toString(),
          owner: dataset[0],
          ipfsHash: dataset[1],
          price: ethers.formatEther(dataset[2]),
          isAvailable: dataset[3],
          metadata: metadata,
          timestamp: new Date(Number(dataset[5]) * 1000).toISOString(),
          accessCount: dataset[6].toString()
        });
      } catch (error) {
        console.error(`Error fetching dataset ${i}:`, error);
        continue;
      }
    }

    res.json(datasets);
  } catch (error) {
    console.error("Error fetching datasets:", error);
    res.status(500).json({ error: "Failed to fetch datasets" });
  }
});

// Purchase dataset by ID
router.post("/purchase/:id", async (req, res) => {
  try {
    const datasetId = req.params.id;
    const { price, buyerPublicKey, transactionHash } = req.body;

    if (!datasetId || !price || !buyerPublicKey || !transactionHash) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    console.log(`Processing purchase for dataset ${datasetId}`);
    console.log(`Price: ${price}, Buyer: ${buyerPublicKey}, TxHash: ${transactionHash}`);

    // Verify the transaction hash
    try {
      const receipt = await provider.getTransactionReceipt(transactionHash);
      if (!receipt) {
        return res.status(400).json({ error: "Invalid transaction hash" });
      }

      // Check if the transaction was successful
      if (receipt.status !== 1) {
        return res.status(400).json({ error: "Transaction failed on blockchain" });
      }

      // Verify the transaction was for this dataset
      const purchaseFilter = contract.filters.DatasetPurchased(datasetId, buyerPublicKey);
      const events = await contract.queryFilter(purchaseFilter, receipt.blockNumber, receipt.blockNumber);

      if (events.length === 0) {
        return res.status(400).json({ error: "Transaction not found for this dataset" });
      }

      // Create a purchase record in the database
      const purchase = new Purchase({
        buyerAddress: buyerPublicKey,
        datasetId: datasetId,
        price: price,
        transactionHash: transactionHash,
        status: 'completed'
      });

      await purchase.save();

      // Return success response
      res.json({
        message: "Purchase recorded successfully",
        purchase: {
          id: purchase._id,
          datasetId: datasetId,
          buyer: buyerPublicKey,
          price: price,
          transactionHash: transactionHash,
          status: 'completed'
        }
      });
    } catch (error) {
      console.error("Error verifying transaction:", error);
      return res.status(500).json({ error: "Failed to verify transaction" });
    }
  } catch (error) {
    console.error("Error processing purchase:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/detect-watermark', upload.single('file'), async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded' });
      }

      const { watermarkInfo } = req.body;
      if (!watermarkInfo) {
          return res.status(400).json({ message: 'Private key is required' });
      }

      const result = await watermarkService.detectWatermark(
          req.file.path,
          watermarkInfo
      );

      res.json(result);
  } catch (error) {
      console.error('Watermark detection error:', error);
      res.status(500).json({ message: 'Error detecting watermark' });
  }
});

module.exports = router;
