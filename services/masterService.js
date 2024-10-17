const _ = require("lodash");
const config = require("../config");
const dbutil = require("../util/db");
const resUtil = require("../util/resUtil");
const db = dbutil.getDatabase(config.mongoDBName);
const masterCollection = db.collection("masterData");

class MasterService {
  constructor(config) {
    this.config = config;
  }

    /*
   * API to fetch master data through the TAPP service. Following are the step performed in the API sequentially.
   * 
   * 1. Fetch the master data to be used across tapp front-end application
   */
  getMasterData(req, res) {
    let apiParams = {
      id: "api.master.get",
      msgid: req.body && req.body.params ? req.body.params.msgid : ""
    };

    let result = {};
    masterCollection.find({}).toArray((err, doc) => {
      if (err) {
        apiParams.err = err;
        resUtil.ERROR(res, apiParams, result);
        return;
      } else {
        if (doc && doc.length) {
          return resUtil.OK(res, apiParams, doc);
        } else {
          apiParams.err = "document not found";
          return resUtil.NOTFOUND(res, apiParams, result);
        }
      }
    });
  }

  getOrganizationConfiguration(req,res){
    const apiParams = {
      id: "api.orgconfig.get",
      msgid: req.body && req.body.params ? req.body.params.msgid :""
    };
    if (!(apiParams && apiParams.id)) {
      apiParams.err = "Invalid Request";
      return resUtil.BADREQUEST(res, apiParams, {});
    }
    let result = {};
    result.organizationConfig = config.organizationConfig
    return resUtil.OK(res, apiParams, result);
  }

}

module.exports = new MasterService(config);
