const Proxy = require('../../../proxy re-encryption/src/proxy.js');
const CryptoJS = require('crypto-js');
const EC = require('elliptic').ec;

class ReEncryptionService {
    constructor() {
        this.options = {
            iv: CryptoJS.enc.Utf8.parse("0000000000000000"),
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        };
    }

    validatePublicKey(publicKey) {
        if (!publicKey.startsWith('04')) {
            throw new Error('Public key must be in uncompressed format (starting with 04)');
        }
        if (publicKey.length !== 130) { // 04 + 64 bytes for x + 64 bytes for y
            throw new Error('Invalid public key length');
        }
        return true;
    }

    deriveMasterKeyFromSignature(signature) {
        const raw = signature.startsWith('0x') ? signature.slice(2, 66) : signature.slice(0, 64);
        const padded = raw.padEnd(64, '0');
        const x = Proxy.from_hex(padded);
        const P = Proxy.point_from_x(x);
        const k = Proxy.big_from_bytes(x);
        const Q = Proxy.scalar_mult(k, P);
        return Proxy.to_hex(Q.x);
    }

    encryptData(publicKey, data) {
        // Validate public key format
        this.validatePublicKey(publicKey);
        
        // Convert the public key from hex to bytes
        const pubKey = Proxy.public_key_from_bytes(Proxy.from_hex(publicKey));
        
        // Generate capsule and symmetric key
        const cp = Proxy.encapsulate(pubKey);
        const symKey = Proxy.to_hex(cp.symmetric_key.to_bytes());

        // Convert symmetric key to CryptoJS format
        const key = CryptoJS.enc.Hex.parse(symKey);
        
        // Convert data to CryptoJS WordArray
        const dataWordArray = CryptoJS.enc.Utf8.parse(data);
        
        // Encrypt the data
        const encrypted = CryptoJS.AES.encrypt(dataWordArray, key, this.options);

        return {
            capsule: Proxy.to_hex(cp.capsule.to_bytes()),
            cipher: encrypted.toString()
        };
    }

    decryptData(privateKey, obj) {
        // Validate private key format
        this.validatePrivateKey(privateKey);
        
        // Convert the private key from hex to bytes
        const priKey = Proxy.private_key_from_bytes(Proxy.from_hex(privateKey));
        
        // Convert capsule from hex to bytes
        const capsule = Proxy.capsule_from_bytes(Proxy.from_hex(obj.key));
        
        // Decapsulate to get symmetric key
        const symKey = Proxy.decapsulate(capsule, priKey);
        
        // Convert symmetric key to CryptoJS format
        const key = CryptoJS.enc.Hex.parse(Proxy.to_hex(symKey.to_bytes()));
        
        // Decrypt the data
        const decrypted = CryptoJS.AES.decrypt(obj.cipher, key, this.options);
        
        // Convert back to string
        return decrypted.toString(CryptoJS.enc.Utf8);
    }

    generateReEncryptionKey(privateKey, publicKey) {
        const priKey = Proxy.private_key_from_bytes(Proxy.from_hex(privateKey));
        const pubKey = Proxy.public_key_from_bytes(Proxy.from_hex(publicKey));

        const rk = Proxy.generate_re_encryption_key(priKey, pubKey);
        return Proxy.to_hex(rk.to_bytes());
    }

    reEncrypt(Rk, obj) {
        const rk = Proxy.re_encryption_key_from_bytes(Proxy.from_hex(Rk));
        const capsule = Proxy.capsule_from_bytes(Proxy.from_hex(obj.key));
        const re_capsule = Proxy.re_encrypt_capsule(capsule, rk);
        
        return {
            ...obj,
            key: Proxy.to_hex(re_capsule.to_bytes())
        };
    }

    async processFile(inputFile, outputFile, operation, keys) {
        const fs = require('fs');
        const fileContent = fs.readFileSync(inputFile, 'utf8');
        
        let data;
        try {
            data = JSON.parse(fileContent);
        } catch (error) {
            throw new Error('Invalid data format: ' + error.message);
        }
        
        let result;
        switch(operation) {
            case 'encrypt':
                result = this.encryptData(keys.publicKey, data);
                break;
            case 'decrypt':
                if (!data.key || !data.cipher) {
                    throw new Error('Invalid encrypted data format: missing key or cipher');
                }
                result = this.decryptData(keys.privateKey, data);
                break;
            case 'reEncrypt':
                if (!data.key) {
                    throw new Error('Invalid data format: missing key');
                }
                result = this.reEncrypt(keys.reEncryptionKey, data);
                break;
            default:
                throw new Error('Invalid operation');
        }

        fs.writeFileSync(outputFile, result);
        return result;
    }
}

module.exports = new ReEncryptionService(); 