const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Jimp = require('jimp');
const csv = require('csv-parser');
const papa = require('papaparse');
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");
const CryptoJS = require("crypto-js");
const fetch = require('node-fetch');

// Set up the upload directory
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Encryption function for file content
function encryptData(data, publicKey) {
  try {
    // Ensure the public key is valid
    if (!publicKey.startsWith("04") && !publicKey.startsWith("02") && !publicKey.startsWith("03")) {
      throw new Error("Invalid public key format. Expected an uncompressed (04...) or compressed (02/03...) key.");
    }

    // Create a shared secret from the public key
    const key = ec.keyFromPublic(publicKey, 'hex');
    const secret = key.getPublic().encode('hex').substring(0, 32);
    
    // Encrypt using AES
    return CryptoJS.AES.encrypt(data, secret).toString();
  } catch (error) {
    console.error("Encryption failed:", error.message);
    throw new Error("Encryption failed: " + error.message);
  }
}

// Apply watermark to image files
async function watermarkImage(filePath, ownerInfo) {
  try {
    const image = await Jimp.read(filePath);
    
    // Create a new image for the watermark text
    const watermark = new Jimp(image.getWidth(), image.getHeight());
    
    // Load font
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
    
    // Add timestamp to owner info
    const watermarkText = `${ownerInfo} | ${new Date().toISOString()}`;
    
    // Place watermark text on the image
    watermark.print(
      font,
      10,
      image.getHeight() - 30,
      {
        text: watermarkText,
        alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT,
        alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM
      },
      image.getWidth() - 20
    );
    
    // Make the watermark semi-transparent
    watermark.opacity(0.5);
    
    // Composite the watermark onto the original image
    image.composite(watermark, 0, 0, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 0.5,
      opacityDest: 1
    });
    
    // Save the watermarked image
    const watermarkedFilePath = filePath.replace(/\.\w+$/, '_watermarked$&');
    await image.writeAsync(watermarkedFilePath);
    
    return watermarkedFilePath;
  } catch (error) {
    console.error('Error applying watermark:', error);
    throw new Error('Failed to apply watermark to image: ' + error.message);
  }
}

// Process CSV files with watermark
async function processCSV(filePath, ownerInfo) {
  try {
    // Read the CSV file
    const results = [];
    const watermarkInfo = `Owned by: ${ownerInfo} | Downloaded: ${new Date().toISOString()}`;
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          try {
            // Add watermark row at the beginning
            const watermarkRow = { Watermark: watermarkInfo };
            results.unshift(watermarkRow);
            
            // Convert back to CSV
            const csv = papa.unparse(results);
            
            // Write to a new file
            const watermarkedFilePath = filePath.replace(/\.\w+$/, '_watermarked$&');
            fs.writeFileSync(watermarkedFilePath, csv);
            
            resolve(watermarkedFilePath);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => reject(error));
    });
  } catch (error) {
    console.error('Error processing CSV:', error);
    throw new Error('Failed to process CSV file: ' + error.message);
  }
}

// Save uploaded file and process based on type
async function saveFile(fileBuffer, originalFilename, metadata, ownerInfo) {
  try {
    // Generate unique filename
    const fileExtension = path.extname(originalFilename);
    const filename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(uploadDir, filename);
    
    // Save file to disk
    fs.writeFileSync(filePath, fileBuffer);
    
    // Process file based on type
    let processedFilePath = filePath;
    const fileType = fileExtension.toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(fileType)) {
      // Process image file
      processedFilePath = await watermarkImage(filePath, ownerInfo);
    } else if (['.csv', '.txt'].includes(fileType)) {
      // Process CSV or text file
      processedFilePath = await processCSV(filePath, ownerInfo);
    }
    // Other file types are saved as-is
    
    return {
      originalFilename,
      filename,
      filePath: processedFilePath,
      fileType: fileExtension.substring(1) // Remove the dot
    };
  } catch (error) {
    console.error('Error saving file:', error);
    throw new Error('Failed to save file: ' + error.message);
  }
}

// Encrypt and prepare file for storage
async function prepareFileForStorage(filePath, metadata, publicKey) {
  try {
    // Read file
    const fileContent = fs.readFileSync(filePath, 'base64');
    
    // Create a JSON object with the file content and metadata
    const fileData = {
      content: fileContent,
      metadata: metadata,
      contentType: path.extname(filePath).substring(1), // File extension without the dot
      timestamp: new Date().toISOString()
    };
    
    // Convert to string for encryption
    const fileDataString = JSON.stringify(fileData);
    
    // Encrypt the data
    const encryptedData = encryptData(fileDataString, publicKey);
    
    return encryptedData;
  } catch (error) {
    console.error('Error preparing file for storage:', error);
    throw new Error('Failed to prepare file for storage: ' + error.message);
  }
}

/**
 * Fetches dataset content from IPFS using multiple gateways
 * @param {string} ipfsHash - The IPFS hash of the dataset
 * @returns {Promise<Object>} - The dataset content and metadata
 */
const getDatasetFromIPFS = async (ipfsHash) => {
  // List of IPFS gateways to try
  const gateways = [
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.filebase.io/ipfs/',
    'https://ipfs.infura.io/ipfs/'
  ];

  let lastError = null;

  // Try each gateway until one succeeds
  for (const gateway of gateways) {
    try {
      const ipfsUrl = `${gateway}${ipfsHash}`;
      console.log('Trying IPFS gateway:', ipfsUrl);

      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(ipfsUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`IPFS gateway ${gateway} returned status: ${response.status}`);
      }

      // Try to parse the response data
      let data;
      try {
        // Try JSON first
        data = await response.json();
        console.log('Successfully parsed IPFS data as JSON');
      } catch (jsonError) {
        console.error('JSON parsing failed:', jsonError);
        
        // If JSON parsing fails, try text
        const textData = await response.text();
        console.log('Parsed IPFS data as text');
        
        try {
          // Try to see if it's JSON with some formatting issues
          data = JSON.parse(textData);
        } catch (textJsonError) {
          console.error('Text JSON parsing failed:', textJsonError);
          
          // If all parsing fails, just use the raw text
          data = { encryptedDataset: textData };
          console.log('Using raw text as encryptedDataset');
        }
      }

      // Validate the data structure
      if (!data.encryptedDataset) {
        throw new Error('No encrypted dataset found in IPFS data');
      }

      return data;
    } catch (error) {
      console.error(`Error with gateway ${gateway}:`, error.message);
      lastError = error;
      // Continue to next gateway
      continue;
    }
  }

  // If we get here, all gateways failed
  throw new Error(`All IPFS gateways failed. Last error: ${lastError.message}`);
};

module.exports = {
  saveFile,
  watermarkImage,
  processCSV,
  prepareFileForStorage,
  encryptData,
  getDatasetFromIPFS
}; 