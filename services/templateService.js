const config = require("../config");
const dbutil = require("../util/db");
const resUtil = require("../util/resUtil");
const db = dbutil.getDatabase(config.mongoDBName);
const tempCollection = db.collection("template");

class TemplateService {
  constructor(config) {
    this.config = config;
  }

  /*
   * API to template by templateId through the TAPP service. Following are the step performed in the API sequentially.
   * 1. Find  the template by templateId & return the response
   */
  getTemplate(req, res) {
    let apiParams = {
      templateId: "api.template.id",
      msgid: req.body.params ? req.body.params.msgid : ""
    };

    if (!req.params.id) {
      apiParams.err = "Invalid Request";
      resUtil.BADREQUEST(res, apiParams, {});
      return;
    }
    let result = {};
    tempCollection.findOne(
      {
        templateId: req.params.id
      },
      function(err, temp) {
        result.template = temp;
        if (err) {
          apiParams.err = err;
          resUtil.ERROR(res, apiParams, result);
          return;
        }
        if (!temp) {
          resUtil.NOTFOUND(res, apiParams, result);
          return;
        }
        resUtil.OK(res, apiParams, result);
      }
    );
  }
}

module.exports = new TemplateService(config);
