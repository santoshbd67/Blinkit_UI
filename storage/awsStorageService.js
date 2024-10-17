const config = require('../config')

class AwsStorageService {
    
    constructor(config) {
        this.config = config;
    }
}

module.exports = new AwsStorageService(config);