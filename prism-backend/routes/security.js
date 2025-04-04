const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const watermarkService = require('../services/security/watermarkService');
const reEncryptionService = require('../services/security/reEncryptionService');
const auth = require('../middleware/auth');
const ec = require('elliptic').ec;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Watermark endpoints
router.post('/watermark', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const privateKey = watermarkService.generatePrivateKey();
        const outputFile = `uploads/watermarked_${Date.now()}.csv`;

        const result = await watermarkService.insertWatermark(
            req.file.path,
            outputFile,
            privateKey
        );

        res.json({
            message: 'File watermarked successfully',
            watermarkHash: result.watermarkHash,
            markedCount: result.markedCount,
            totalTuples: result.totalTuples,
            outputFile
        });
    } catch (error) {
        console.error('Watermarking error:', error);
        res.status(500).json({ message: 'Error watermarking file' });
    }
});

router.post('/detect-watermark', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { privateKey } = req.body;
        if (!privateKey) {
            return res.status(400).json({ message: 'Private key is required' });
        }

        const result = await watermarkService.detectWatermark(
            req.file.path,
            privateKey
        );

        res.json(result);
    } catch (error) {
        console.error('Watermark detection error:', error);
        res.status(500).json({ message: 'Error detecting watermark' });
    }
});

// Proxy Re-encryption endpoints
router.post('/encrypt', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Get public key from query parameters
        const publicKey = req.query.publicKey;
        if (!publicKey) {
            return res.status(400).json({ message: 'Public key is required' });
        }

        // Debug logging
        console.log('Received public key:', publicKey);
        console.log('Public key length:', publicKey.length);
        console.log('Public key starts with 04:', publicKey.startsWith('04'));
        console.log('Public key characters:', Array.from(publicKey).map(c => c.charCodeAt(0)));

        // Ensure public key is in uncompressed format
        let formattedPublicKey = publicKey;
        if (!publicKey.startsWith('04')) {
            // If it's not in uncompressed format, try to convert it
            try {
                const key = ec.keyFromPublic(publicKey, 'hex');
                formattedPublicKey = key.getPublic(false, 'hex'); // false for uncompressed format
            } catch (error) {
                return res.status(400).json({ 
                    message: 'Invalid public key format. Key must be in uncompressed format (starting with 04) or a valid compressed format.' 
                });
            }
        }

        const outputFile = `uploads/encrypted_${Date.now()}.json`;
        const result = await reEncryptionService.processFile(
            req.file.path,
            outputFile,
            'encrypt',
            { publicKey: formattedPublicKey }
        );

        res.json({
            message: 'File encrypted successfully',
            outputFile
        });
    } catch (error) {
        console.error('Encryption error:', error);
        res.status(500).json({ message: 'Error encrypting file' });
    }
});

router.post('/decrypt', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { signature, message, address } = req.body;
        if (!signature || !message || !address) {
            return res.status(400).json({ message: 'Signature, message, and address are required' });
        }

        // Verify the signature
        const { ethers } = require('ethers');
        const recoveredAddress = ethers.verifyMessage(message, signature);
        
        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            return res.status(401).json({ message: 'Invalid signature' });
        }

        // Check if the user has access to the dataset
        const { contract } = require('../config/web3');
        const datasetId = message.match(/dataset (\d+)/)?.[1];
        
        if (datasetId) {
            const hasAccess = await contract.hasAccess(datasetId, address);
            if (!hasAccess) {
                return res.status(403).json({ message: 'You do not have access to this dataset' });
            }
        }

        // Read the encrypted data from the file
        const fs = require('fs');
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        
        // Debug logging
        console.log('Received file content:', fileContent);
        
        // Parse the encrypted data
        let encryptedData;
        try {
            encryptedData = JSON.parse(fileContent);
            console.log('Parsed encrypted data:', encryptedData);
            
            if (!encryptedData.key || !encryptedData.cipher) {
                console.log('Missing required fields:', {
                    hasKey: !!encryptedData.key,
                    hasCipher: !!encryptedData.cipher,
                    data: encryptedData
                });
                throw new Error('Invalid encrypted data format');
            }
        } catch (error) {
            console.error('Error parsing encrypted data:', error);
            return res.status(400).json({ message: 'Invalid encrypted data format' });
        }

        // Create a temporary file with the encrypted data
        const tempFile = `uploads/temp_${Date.now()}.json`;
        fs.writeFileSync(tempFile, JSON.stringify(encryptedData));

        try {
            // Convert the signature to a valid private key format
            // Remove the '0x' prefix if present and take the first 64 characters
            const privateKey = signature.startsWith('0x') 
                ? signature.slice(2, 66) 
                : signature.slice(0, 64);

            // Pad with zeros if needed
            const paddedPrivateKey = privateKey.padEnd(64, '0');

            // Decrypt the data
            const outputFile = `uploads/decrypted_${Date.now()}.txt`;
            const decryptedData = await reEncryptionService.processFile(
                tempFile,
                outputFile,
                'decrypt',
                { privateKey: paddedPrivateKey }
            );

            // Clean up temporary files
            fs.unlinkSync(req.file.path);
            fs.unlinkSync(tempFile);
            fs.unlinkSync(outputFile);

            res.json({
                message: 'File decrypted successfully',
                decryptedData
            });
        } catch (error) {
            // Clean up temporary files in case of error
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
            throw error;
        }
    } catch (error) {
        console.error('Decryption error:', error);
        res.status(500).json({ message: 'Error decrypting file: ' + error.message });
    }
});

router.post('/re-encrypt', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { reEncryptionKey } = req.body;
        if (!reEncryptionKey) {
            return res.status(400).json({ message: 'Re-encryption key is required' });
        }

        const outputFile = `uploads/reencrypted_${Date.now()}.json`;
        const result = await reEncryptionService.processFile(
            req.file.path,
            outputFile,
            'reEncrypt',
            { reEncryptionKey }
        );

        res.json({
            message: 'File re-encrypted successfully',
            outputFile
        });
    } catch (error) {
        console.error('Re-encryption error:', error);
        res.status(500).json({ message: 'Error re-encrypting file' });
    }
});

router.post('/generate-re-encryption-key', auth, async (req, res) => {
    try {
        const { privateKey, publicKey } = req.body;
        if (!privateKey || !publicKey) {
            return res.status(400).json({ message: 'Both private and public keys are required' });
        }

        const reEncryptionKey = reEncryptionService.generateReEncryptionKey(
            privateKey,
            publicKey
        );

        res.json({
            message: 'Re-encryption key generated successfully',
            reEncryptionKey
        });
    } catch (error) {
        console.error('Re-encryption key generation error:', error);
        res.status(500).json({ message: 'Error generating re-encryption key' });
    }
});

module.exports = router; 