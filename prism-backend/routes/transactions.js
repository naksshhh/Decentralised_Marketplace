const express = require("express");
const router = express.Router();
const { contract, provider } = require("../config/web3");
const ethers = require('ethers');
const auth = require('../middleware/auth');

// Get recent transactions
router.get("/recent", async (req, res) => {
  try {
    console.log('\n=== Fetching Recent Transactions ===');
    const currentBlock = await provider.getBlockNumber();
    const BLOCK_RANGE = 1000; // Last 1000 blocks
    const CHUNK_SIZE = 499; // Query in chunks of 100 blocks
    const fromBlock = Math.max(0, currentBlock - BLOCK_RANGE);
    
    // Initialize empty arrays for events
    let purchaseEvents = [];
    let uploadEvents = [];
    
    // Query blocks in chunks
    for (let chunkStart = fromBlock; chunkStart < currentBlock; chunkStart += CHUNK_SIZE) {
      const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, currentBlock);
      console.log(`Querying blocks ${chunkStart} to ${chunkEnd}`);
      
      // Try to get purchase events for this chunk
      try {
        const purchaseFilter = contract.filters.DatasetPurchased();
        const chunkPurchaseEvents = await contract.queryFilter(purchaseFilter, chunkStart, chunkEnd);
        purchaseEvents = purchaseEvents.concat(chunkPurchaseEvents);
        console.log(`Found ${chunkPurchaseEvents.length} purchase events in this chunk`);
      } catch (error) {
        console.error(`Error fetching purchase events for blocks ${chunkStart}-${chunkEnd}:`, error);
        // Continue with next chunk
      }
      
      // Try to get upload events for this chunk
      try {
        const uploadFilter = contract.filters.DatasetUploaded();
        const chunkUploadEvents = await contract.queryFilter(uploadFilter, chunkStart, chunkEnd);
        uploadEvents = uploadEvents.concat(chunkUploadEvents);
        console.log(`Found ${chunkUploadEvents.length} upload events in this chunk`);
      } catch (error) {
        console.error(`Error fetching upload events for blocks ${chunkStart}-${chunkEnd}:`, error);
        // Continue with next chunk
      }
    }
    
    console.log(`Total purchase events found: ${purchaseEvents.length}`);
    console.log(`Total upload events found: ${uploadEvents.length}`);
    
    // Combine and process events
    const transactions = [];
    
    // Process purchase events
    for (const event of purchaseEvents) {
      try {
        const { datasetId, buyer } = event.args;
        const dataset = await contract.getDataset(datasetId);
        transactions.push({
          id: event.transactionHash,
          type: 'purchase',
          amount: ethers.formatEther(dataset[2]),
          timestamp: new Date(event.blockNumber * 1000).toISOString(),
          status: 'completed',
          datasetId: datasetId.toString(),
          user: buyer
        });
      } catch (error) {
        console.error("Error processing purchase event:", error);
        continue;
      }
    }
    
    // Process upload events
    for (const event of uploadEvents) {
      try {
        const { datasetId, owner } = event.args;
        const dataset = await contract.getDataset(datasetId);
        transactions.push({
          id: event.transactionHash,
          type: 'upload',
          amount: ethers.formatEther(dataset[2]),
          timestamp: new Date(event.blockNumber * 1000).toISOString(),
          status: 'completed',
          datasetId: datasetId.toString(),
          user: owner
        });
      } catch (error) {
        console.error("Error processing upload event:", error);
        continue;
      }
    }
    
    // Sort by timestamp (newest first)
    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Return only the 10 most recent transactions
    res.json(transactions.slice(0, 10));
  } catch (error) {
    console.error("Error fetching recent transactions:", error);
    // Return empty array instead of error to prevent frontend issues
    res.json([]);
  }
});

// Get transaction history
router.get('/history', async (req, res) => {
  console.log('\n=== Starting transaction history request ===');
  console.log('Request received at:', new Date().toISOString());
  console.log('Full URL:', req.originalUrl);
  console.log('Query params:', JSON.stringify(req.query, null, 2));
  
  try {
    const userAddress = req.query.address;
    console.log('\n=== Address Validation ===');
    console.log('Raw address from query:', userAddress);
    
    if (!userAddress) {
      console.log('ERROR: No address provided in query');
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

    console.log('\n=== Contract Information ===');
    console.log('Contract address:', contract.target);
    console.log('Contract interface:', contract.interface.format(true));

    console.log('\n=== Fetching Transactions ===');
    console.log('Using formatted address:', formattedAddress);
    
    const currentBlock = await provider.getBlockNumber();
    console.log('Current block:', currentBlock);
    
    const BLOCK_CHUNK_SIZE = 499; // Increased chunk size since we're not getting errors
    const TOTAL_BLOCKS = 5000; // Reduced total blocks to look back
    let fromBlock = Math.max(0, currentBlock - TOTAL_BLOCKS);
    const transactions = [];
    const datasetCache = new Map(); // Cache for dataset details  

    // Helper function to get dataset details with caching
    const getDatasetDetails = async (datasetId) => {
      if (datasetCache.has(datasetId)) {
        return datasetCache.get(datasetId);
      }
      const dataset = await contract.getDataset(datasetId);
      const details = {
        price: ethers.formatEther(dataset[2]),
        owner: dataset[0],
        ipfsHash: dataset[1],
        isAvailable: dataset[3],
        metadata: dataset[4]
      };
      datasetCache.set(datasetId, details);
      return details;
    };

    // Process events in parallel
    const processEvents = async (events, type) => {
      const processedEvents = [];
      for (const event of events) {
        try {
          const { datasetId } = event.args;
          const dataset = await getDatasetDetails(datasetId);
          
          // Get block timestamp safely
          let timestamp;
          try {
            const block = await provider.getBlock(event.blockNumber);
            if (block && block.timestamp) {
              timestamp = block.timestamp * 1000; // Convert to milliseconds
            } else {
              console.error(`Invalid block timestamp for block ${event.blockNumber}`);
              timestamp = Date.now();
            }
          } catch (error) {
            console.error(`Error getting block timestamp for block ${event.blockNumber}:`, error);
            timestamp = Date.now();
          }
          
          // Ensure timestamp is a valid number
          timestamp = Number(timestamp);
          if (isNaN(timestamp) || timestamp <= 0) {
            console.error(`Invalid timestamp for block ${event.blockNumber}, using current time`);
            timestamp = Date.now();
          }
          
          // Parse metadata if available
          let metadata = {};
          try {
            if (dataset.metadata) {
              // Check if metadata is already an object
              if (typeof dataset.metadata === 'object') {
                metadata = dataset.metadata;
              } else if (typeof dataset.metadata === 'string') {
                // Try to parse as JSON first
                try {
                  metadata = JSON.parse(dataset.metadata);
                } catch (parseError) {
                  // If parsing fails, it's a plain string - use it as title
                  metadata = {
                    title: dataset.metadata,
                    description: dataset.metadata,
                    originalFilename: dataset.metadata,
                    fileType: 'text/plain',
                    fileSize: 0,
                    uploadDate: new Date().toISOString(),
                    contentType: 'text',
                    textType: 'plain'
                  };
                }
              }
            } else {
              // No metadata available
              metadata = {
                title: 'Untitled Dataset',
                description: 'No description available',
                originalFilename: 'untitled',
                fileType: 'text/plain',
                fileSize: 0,
                uploadDate: new Date().toISOString(),
                contentType: 'text',
                textType: 'plain'
              };
            }
          } catch (error) {
            console.error(`Error handling metadata for dataset ${datasetId}:`, error);
            metadata = {
              title: 'Untitled Dataset',
              description: 'No description available',
              originalFilename: 'untitled',
              fileType: 'text/plain',
              fileSize: 0,
              uploadDate: new Date().toISOString(),
              contentType: 'text',
              textType: 'plain'
            };
          }
          
          const transaction = {
            id: event.transactionHash,
            type: type,
            amount: dataset.price || '0',
            value: dataset.price || '0',
            timestamp: timestamp, // Unix timestamp in milliseconds
            createdAt: timestamp, // Unix timestamp in milliseconds
            status: 'completed',
            datasetId: datasetId.toString(),
            user: type === 'purchase' ? event.args.buyer : event.args.owner,
            dataset: {
              id: datasetId.toString(),
              title: metadata.title || 'Untitled Dataset',
              price: dataset.price || '0',
              owner: dataset.owner,
              ipfsHash: dataset.ipfsHash,
              isAvailable: dataset.isAvailable,
              metadata: metadata,
              accessCount: 0,
              createdAt: timestamp, // Unix timestamp in milliseconds
              timestamp: timestamp // Unix timestamp in milliseconds
            }
          };

          // Add additional fields for purchase events
          if (type === 'purchase') {
            transaction.buyer = event.args.buyer;
            transaction.seller = event.args.owner;
            transaction.value = ethers.formatEther(event.args.price || '0');
            transaction.purchaseDate = timestamp; // Unix timestamp in milliseconds
          }

          processedEvents.push(transaction);
        } catch (error) {
          console.error(`Error processing ${type} event ${event.transactionHash}:`, error);
          continue;
        }
      }
      return processedEvents;
    };

    // Get purchase events
    console.log('\n=== Fetching Purchase Events ===');
    console.log(`Looking back ${TOTAL_BLOCKS} blocks from ${currentBlock}`);
    const purchaseEvents = [];
    while (fromBlock < currentBlock) {
      const toBlock = Math.min(fromBlock + BLOCK_CHUNK_SIZE, currentBlock);
      console.log(`Checking blocks ${fromBlock} to ${toBlock} for purchase events`);
      
      try {
        const purchaseFilter = contract.filters.DatasetPurchased(null, formattedAddress);
        const events = await contract.queryFilter(purchaseFilter, fromBlock, toBlock);
        purchaseEvents.push(...events);
        console.log(`Found ${events.length} purchase events in this range`);
      } catch (error) {
        console.error(`Error fetching purchase events for blocks ${fromBlock}-${toBlock}:`, error);
      }

      fromBlock = toBlock + 1;
    }

    // Get upload events
    console.log('\n=== Fetching Upload Events ===');
    fromBlock = Math.max(0, currentBlock - TOTAL_BLOCKS);
    const uploadEvents = [];
    while (fromBlock < currentBlock) {
      const toBlock = Math.min(fromBlock + BLOCK_CHUNK_SIZE, currentBlock);
      console.log(`Checking blocks ${fromBlock} to ${toBlock} for upload events`);
      
      try {
        const uploadFilter = contract.filters.DatasetUploaded(formattedAddress);
        const events = await contract.queryFilter(uploadFilter, fromBlock, toBlock);
        uploadEvents.push(...events);
        console.log(`Found ${events.length} upload events in this range`);
      } catch (error) {
        console.error(`Error fetching upload events for blocks ${fromBlock}-${toBlock}:`, error);
      }

      fromBlock = toBlock + 1;
    }

    // Process all events in parallel
    console.log('\n=== Processing Events ===');
    const [processedPurchases, processedUploads] = await Promise.all([
      processEvents(purchaseEvents, 'purchase'),
      processEvents(uploadEvents, 'upload')
    ]);

    // Combine and sort transactions
    transactions.push(...processedPurchases, ...processedUploads);
    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log(`\n=== Processing Complete ===`);
    console.log(`Found total of ${transactions.length} transactions`);

    res.json(transactions);
  } catch (error) {
    console.error('\n=== Route Error ===');
    console.error('Error in transaction history route:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get transactions by user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('\n=== Fetching User Transactions ===');
    console.log('User ID:', userId);
    
    // Validate and format Ethereum address
    let formattedAddress;
    try {
      formattedAddress = ethers.getAddress(userId).toLowerCase();
      console.log('Formatted address:', formattedAddress);
    } catch (error) {
      console.log('Address formatting failed:', error.message);
      return res.status(400).json({ message: "Invalid Ethereum address format" });
    }

    const currentBlock = await provider.getBlockNumber();
    const BLOCK_RANGE = 1000; // Last 1000 blocks
    const fromBlock = Math.max(0, currentBlock - BLOCK_RANGE);
    
    // Get purchase events
    const purchaseFilter = contract.filters.DatasetPurchased(null, formattedAddress);
    const purchaseEvents = await contract.queryFilter(purchaseFilter, fromBlock, currentBlock);
    
    // Get upload events
    const uploadFilter = contract.filters.DatasetUploaded(formattedAddress);
    const uploadEvents = await contract.queryFilter(uploadFilter, fromBlock, currentBlock);
    
    // Combine and process events
    const transactions = [];
    
    // Process purchase events
    for (const event of purchaseEvents) {
      const { datasetId } = event.args;
      const dataset = await contract.getDataset(datasetId);
      transactions.push({
        id: event.transactionHash,
        type: 'purchase',
        amount: ethers.formatEther(dataset[2]),
        timestamp: new Date(event.blockNumber * 1000).toISOString(),
        status: 'completed',
        datasetId: datasetId.toString()
      });
    }
    
    // Process upload events
    for (const event of uploadEvents) {
      const { datasetId } = event.args;
      const dataset = await contract.getDataset(datasetId);
      transactions.push({
        id: event.transactionHash,
        type: 'upload',
        amount: ethers.formatEther(dataset[2]),
        timestamp: new Date(event.blockNumber * 1000).toISOString(),
        status: 'completed',
        datasetId: datasetId.toString()
      });
    }
    
    // Sort by timestamp (newest first)
    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(transactions);
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    res.status(500).json({ error: "Failed to fetch user transactions" });
  }
});

// Get transaction by ID (must be last to avoid conflicts with other routes)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log('\n=== Fetching Transaction by ID ===');
    console.log('Transaction ID:', id);
    
    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(id)) {
      return res.status(400).json({ error: "Invalid transaction hash format" });
    }
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(id);
    if (!receipt) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Get transaction details
    const tx = await provider.getTransaction(id);
    if (!tx) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Get block details for timestamp
    const block = await provider.getBlock(receipt.blockNumber);
    
    // Check if this is a purchase or upload transaction
    let transactionType = 'unknown';
    let datasetId = null;
    let amount = '0';
    
    // Check for DatasetPurchased event
    const purchaseFilter = contract.filters.DatasetPurchased();
    const purchaseEvents = await contract.queryFilter(purchaseFilter, receipt.blockNumber, receipt.blockNumber);
    const purchaseEvent = purchaseEvents.find(e => e.transactionHash === id);
    
    if (purchaseEvent) {
      transactionType = 'purchase';
      datasetId = purchaseEvent.args.datasetId;
      amount = ethers.formatEther(tx.value);
    } else {
      // Check for DatasetUploaded event
      const uploadFilter = contract.filters.DatasetUploaded();
      const uploadEvents = await contract.queryFilter(uploadFilter, receipt.blockNumber, receipt.blockNumber);
      const uploadEvent = uploadEvents.find(e => e.transactionHash === id);
      
      if (uploadEvent) {
        transactionType = 'upload';
        datasetId = uploadEvent.args.datasetId;
      }
    }

    // Get dataset details if available
    let datasetDetails = null;
    if (datasetId) {
      try {
        const dataset = await contract.getDataset(datasetId);
        datasetDetails = {
          id: datasetId.toString(),
          price: ethers.formatEther(dataset[2]),
          owner: dataset[0],
          ipfsHash: dataset[1],
          isAvailable: dataset[3],
          metadata: dataset[4]
        };
      } catch (error) {
        console.error('Error fetching dataset details:', error);
      }
    }

    // Construct response
    const response = {
      id: id,
      type: transactionType,
      amount: amount,
      timestamp: new Date(block.timestamp * 1000).toISOString(),
      status: receipt.status === 1 ? 'completed' : 'failed',
      from: tx.from,  
      to: tx.to,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      dataset: datasetDetails
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});

module.exports = router; 