const Proxy = require("./index").Proxy;
const { log } = require("console");
const PRE = require("./index");
const fs = require('fs');
function test() {

    const inputPath = "./input.txt";
    const outputPath = "./output.txt";
    const encryptedFilePath = "./encrypted.json";
    const reEncryptedFilePath = "./reEncrypted.json";

    var kp_A = Proxy.generate_key_pair();
    var sk_A = Proxy.to_hex(kp_A.get_private_key().to_bytes());
    var pk_A = Proxy.to_hex(kp_A.get_public_key().to_bytes());

    var kp_B = Proxy.generate_key_pair();
    var sk_B = Proxy.to_hex(kp_B.get_private_key().to_bytes());
    var pk_B = Proxy.to_hex(kp_B.get_public_key().to_bytes());


    // let dataToEncrypt = fs.readFileSync(inputPath);
    // dataToEncrypt = dataToEncrypt.toString();
    // let obj = PRE.encryptData(pk_A, dataToEncrypt);
    // let rk = PRE.generateReEncrytionKey(sk_A, pk_B);
    // PRE.reEncryption(rk, obj)
    // let decryptData = PRE.decryptData(sk_B, obj)
    // fs.writeFileSync(outputPath, obj.cipher);
    //fs.writeFile(outputPath, decryptData);
    //console.log(decryptData)
    
    encrypt(inputPath, pk_A, encryptedFilePath);
    reEncrypt(sk_A, pk_B, reEncryptedFilePath, encryptedFilePath);
    decrypt(sk_B, outputPath, reEncryptedFilePath);
}

function decrypt(sk_B, outputPath, reEncryptedFilePath) {
    let reEncrypted = fs.readFileSync(reEncryptedFilePath);
    reEncrypted = reEncrypted.toString();
    let reEncryptedObj = JSON.parse(reEncrypted);
    let decryptData = PRE.decryptData(sk_B, reEncryptedObj);
    fs.writeFileSync(outputPath, decryptData);
}

function encrypt(inputPath, pk_A, encryptedFilePath) {
    let dataToEncrypt = fs.readFileSync(inputPath);
    dataToEncrypt = dataToEncrypt.toString();
    let obj = PRE.encryptData(pk_A, dataToEncrypt);
    let dataToStore = obj;
    fs.writeFileSync(encryptedFilePath, JSON.stringify(dataToStore));
    //return obj;
}

function reEncrypt(sk_A, pk_B, reEncryptedFilePath, encryptedFilePath) {
    let dataJSON = (fs.readFileSync(encryptedFilePath)).toString();
    let encrypted = JSON.parse(dataJSON);
    let rk = PRE.generateReEncrytionKey(sk_A, pk_B);
    PRE.reEncryption(rk, encrypted)
    let dataToStore = encrypted;
    fs.writeFileSync(reEncryptedFilePath, JSON.stringify(dataToStore));
    //return obj;
}

test()

module.exports = {
    encrypt,
    decrypt,
    reEncrypt
}