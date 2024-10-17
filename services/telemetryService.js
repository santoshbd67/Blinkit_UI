const config = require("../config");

class TelemetryService {
  constructor(config) {
    this.config = config;
  }
  syncTelemetry(req, res) {}
}

module.exports = new TelemetryService(config);
