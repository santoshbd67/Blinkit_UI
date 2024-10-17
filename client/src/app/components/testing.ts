const CryptoJS1 = require('crypto-js');

let secretPassphrase = CryptoJS1.enc.Utf16.parse('PAIGESISPOWEREDBYTAOAUTOMATION2022');


let encrytedEmail = 'upcZeq6p5khdqk7Mz3IUTx/vwGf+iuWkDtRTfPagCEs=';
let encrytedPassword = 'N4ExxVUtntAxzfKdWo8MLA==';


function decrypt(cipherText) {
    let plainText = CryptoJS1.AES.decrypt(cipherText, secretPassphrase, { mode: CryptoJS1.mode.ECB }).toString(CryptoJS1.enc.Utf8);
    return plainText;
}

function encrypt(plainText) {
    return CryptoJS1.AES.encrypt(plainText, secretPassphrase, { mode: CryptoJS1.mode.ECB }).toString();
}

function base64Encode(payload) {
    let encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
    return encoded;
}

function base64Decode(encryptedPayload) {
    let decryptedPayload = Buffer.from(encryptedPayload, 'base64').toString('binary');
    return decryptedPayload;
}

//console.log("Your encrypted key is:- " + encrypt(encrytedEmail));
console.log("Decrypted Email is:- \n" + decrypt(encrytedEmail));
console.log("Decrypted Password is:- \n" + decrypt(encrytedPassword));
//console.log("Decrypted Username is:- \n" + CryptoJS1.SHA256(encrytedPassword).toString());

let obj = {
    name: "kanak",
    role: "admin"
}

let decryptedObject = base64Encode(obj);

let encryptedData = "eyJ1c2VyTmFtZSI6ImhhcmkxMTEiLCJlbWFpbElkIjoiaGFyaTExMUB0YW9hdXRvbWF0aW9uLmNvbSIsInBhc3N3b3JkIjoiMjVkNTVhZDI4M2FhNDAwYWY0NjRjNzZkNzEzYzA3YWQiLCJyb2xlIjoiNjJhNzFjYjM1MmRiNGU4NWJjYThlNjlkIiwidXNlckNyZWF0ZWRCeSI6Im9yZ2FuaXphdGlvbiJ9";

//console.log("Your encrypted Object is:- " + decryptedObject);
//console.log("Your decrypted Object is:- \n" + base64Decode(encryptedData));



