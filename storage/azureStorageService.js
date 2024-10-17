const config = require('../config')

const azureStorage = require('azure-storage');
const blobService = azureStorage.createBlobService(config.storageAccessKey, config.storageAccessSecret);
 
class AzureStorageService {
    
    constructor(config) {
        this.config = config;
    }

}
const azureStorageService = new AzureStorageService(config);
module.exports = azureStorageService;