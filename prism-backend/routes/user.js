const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { contract, provider } = require('../config/web3');

// Helper function to convert Wei to Ether
const weiToEther = (wei) => {
  try {
    console.log('Converting Wei to Ether:', wei);
    // Convert Wei to ETH (1 ETH = 10^18 Wei)
    const weiBigInt = BigInt(wei);
    const ether = Number(weiBigInt) / Number(BigInt('1000000000000000000'));
    console.log('Converted value:', ether);
    return ether.toFixed(4);
  } catch (error) {
    console.error('Error converting Wei to Ether:', error);
    return '0';
  }
};

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      id: req.user?.id || 'anonymous',
      email: req.user?.email || 'anonymous@example.com',
      publicKey: req.user?.publicKey || 'anonymous',
      username: req.user?.username || 'Anonymous',
      joinDate: req.user?.createdAt || new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user stats
router.get('/stats', auth, async (req, res) => {
  try {
    const userAddress = req.user?.publicKey || req.query.address;
    if (!userAddress) {
      return res.status(400).json({ message: "User address is required" });
    }

    const currentBlock = await provider.getBlockNumber();
    const BLOCK_RANGE = 100; // Further reduced to 100 blocks
    let fromBlock = Math.max(0, currentBlock - BLOCK_RANGE);
    let totalUploads = 0;
    let totalPurchases = 0;
    let totalRevenue = '0';
    let totalSpent = '0';

    try {
      // Get total datasets and check ownership
      const totalDatasets = await contract.datasetCounter();
      console.log('Total datasets:', totalDatasets.toString());
      
      for (let i = 1; i <= totalDatasets; i++) {
        try {
          const dataset = await contract.getDataset(i);
          console.log(`Dataset ${i} values:`, {
            owner: dataset[0],
            price: dataset[2].toString(),
            accessCount: dataset[6].toString()
          });
          
          if (dataset[0].toLowerCase() === userAddress.toLowerCase()) {
            totalUploads++;
            // Calculate revenue using Wei values
            const price = dataset[2].toString();
            const accessCount = dataset[6].toString();
            const revenue = (BigInt(price) * BigInt(accessCount)).toString();
            totalRevenue = (BigInt(totalRevenue) + BigInt(revenue)).toString();
          }
        } catch (error) {
          console.error(`Error checking dataset ${i}:`, error);
        }
      }

      // Get purchase events in chunks
      while (fromBlock < currentBlock) {
        const toBlock = Math.min(fromBlock + BLOCK_RANGE, currentBlock);
        const purchaseFilter = contract.filters.DatasetPurchased(null, userAddress);
        const purchaseEvents = await contract.queryFilter(purchaseFilter, fromBlock, toBlock);
        totalPurchases += purchaseEvents.length;

        // Calculate total spent
        for (const event of purchaseEvents) {
          const { datasetId } = event.args;
          const dataset = await contract.getDataset(datasetId);
          console.log(`Purchase event for dataset ${datasetId}:`, {
            price: dataset[2].toString()
          });
          // Add price to total spent
          totalSpent = (BigInt(totalSpent) + BigInt(dataset[2].toString())).toString();
        }

        fromBlock = toBlock + 1;
      }

      // Format the results
      const formattedRevenue = weiToEther(totalRevenue);
      const formattedSpent = weiToEther(totalSpent);
      console.log('Final values:', {
        totalRevenue,
        formattedRevenue,
        totalSpent,
        formattedSpent
      });

      res.json({
        totalUploads,
        totalPurchases,
        totalRevenue: formattedRevenue,
        totalSpent: formattedSpent
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Return partial results if available
      res.json({
        totalUploads,
        totalPurchases,
        totalRevenue: weiToEther(totalRevenue),
        totalSpent: weiToEther(totalSpent),
        error: 'Some data may be incomplete due to large block range'
      });
    }
  } catch (error) {
    console.error('Error in stats route:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user's purchases from blockchain
router.get('/purchases', auth, async (req, res) => {
  try {
    // Get the user's address from the request body or query parameters
    const userAddress = req.body.address || req.query.address;
    
    if (!userAddress) {
      return res.status(400).json({ 
        message: "User address is required. Please provide it in the request body or query parameters." 
      });
    }
    
    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    
    // Calculate block range (last 10000 blocks)
    const fromBlock = Math.max(0, currentBlock - 10000);
    const toBlock = currentBlock;
    
    console.log(`Fetching logs from block ${fromBlock} to ${toBlock}`);
    
    // Fetch logs in chunks of 500 blocks
    const CHUNK_SIZE = 500;
    let allEvents = [];
    
    for (let startBlock = fromBlock; startBlock <= toBlock; startBlock += CHUNK_SIZE) {
      const endBlock = Math.min(startBlock + CHUNK_SIZE - 1, toBlock);
      console.log(`Fetching chunk from block ${startBlock} to ${endBlock}`);
      
      try {
        const filter = contract.filters.DatasetPurchased(null, userAddress);
        const events = await contract.queryFilter(filter, startBlock, endBlock);
        allEvents = allEvents.concat(events);
      } catch (error) {
        console.error(`Error fetching chunk ${startBlock}-${endBlock}:`, error);
        // Continue with next chunk even if one fails
        continue;
      }
    }
    
    // Process each purchase event
    const purchases = await Promise.all(allEvents.map(async (event) => {
      const { datasetId, buyer } = event.args;
      
      // Get dataset details from blockchain
      const dataset = await contract.getDataset(datasetId);
      
      // Parse metadata if it's a string
      let metadata = {};
      try {
        if (typeof dataset.metadata === 'string') {
          // Try to parse as JSON
          try {
            metadata = JSON.parse(dataset.metadata);
          } catch (e) {
            // If parsing fails, create a simple metadata object
            metadata = {
              name: dataset.metadata,
              raw: dataset.metadata
            };
          }
        } else {
          metadata = dataset.metadata || {};
        }
      } catch (e) {
        console.error('Error parsing metadata:', e);
        metadata = {
          name: 'Unknown Dataset',
          raw: dataset.metadata
        };
      }
      
      return {
        id: event.transactionHash,
        datasetId: datasetId.toString(),
        datasetName: metadata.name || 'Unknown Dataset',
        price: ethers.formatEther(dataset.price),
        transactionHash: event.transactionHash,
        purchaseDate: new Date(Number(dataset.timestamp) * 1000).toISOString(),
        status: 'completed',
        metadata
      };
    }));

    // Sort purchases by date (newest first)
    purchases.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));

    res.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user's uploads
router.get('/uploads', auth, async (req, res) => {
  try {
    const userAddress = req.user?.publicKey || req.query.address;
    if (!userAddress) {
      return res.status(400).json({ message: "User address is required" });
    }

    const totalDatasets = await contract.datasetCounter();
    const uploads = [];

    for (let i = 1; i <= totalDatasets; i++) {
      try {
        const dataset = await contract.getDataset(i);
        if (dataset[0].toLowerCase() === userAddress.toLowerCase()) {
          let metadata = {};
          try {
            metadata = typeof dataset.metadata === 'string' 
              ? JSON.parse(dataset.metadata) 
              : dataset.metadata;
          } catch (e) {
            metadata = { name: 'Unknown Dataset' };
          }

          uploads.push({
            id: i.toString(),
            title: metadata.name || 'Unknown Dataset',
            price: ethers.formatEther(dataset[2]),
            purchases: dataset[6].toString(),
            revenue: (Number(ethers.formatEther(dataset[2])) * Number(dataset[6])).toFixed(4),
            createdAt: new Date(Number(dataset[5]) * 1000).toISOString()
          });
        }
      } catch (error) {
        console.error(`Error checking dataset ${i}:`, error);
      }
    }

    res.json(uploads);
  } catch (error) {
    console.error('Error fetching uploads:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 