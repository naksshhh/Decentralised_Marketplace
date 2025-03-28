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

        const { privateKey } = req.body;
        if (!privateKey) {
            return res.status(400).json({ message: 'Private key is required' });
        }

        const outputFile = `uploads/decrypted_${Date.now()}.txt`;
        const result = await reEncryptionService.processFile(
            req.file.path,
            outputFile,
            'decrypt',
            { privateKey }
        );

        res.json({
            message: 'File decrypted successfully',
            outputFile
        });
    } catch (error) {
        console.error('Decryption error:', error);
        res.status(500).json({ message: 'Error decrypting file' });
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