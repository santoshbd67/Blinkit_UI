const _ = require("lodash");
const async = require("async");
const config = require("../config");
const constants = require("../util/constant");
const dbutil = require("../util/db");
const util = require("../util/util");
const resUtil = require("../util/resUtil");
const request = require("request");
const validator = require("../util/validatorUtil");
const logger = require("../logger/logger");
const uuid = require("uuid");

const db = dbutil.getDatabase(config.mongoDBName);
const docCollection = db.collection("document_metadata");

class ExternalService {
  constructor(config) {
    this.config = config;
  }

  /* Method to submit invoice for preprocessing through the TAPP service. Following are the step performed in the Method sequentially.
   *
   * 1. Calls the external preprocess/submit which returns response 2times
   *  a) synchronous  response -> this updates the document metadata as running or inprogress status, for exact status names refer github wiki
   *  b) asynchronous  response -> this updates the document metadata after preprocessor finishes initial extraction of invoiceNo & vendorId etc & updates the doucment metadata status as 'READY_FOR_EXTRACTION' , for exact status names refer github wiki
   * 2. Returns an error if API is not responding or the API response is not OK
   */
  callPreprocessor(document, callback) {
    const requestBody = {
      id: "api.document.add",
      ver: document.ver,
      ts: document.ts,
      params: document.params,
      request: {
        documentId: document.request.documentId,
        location: document.request.uploadUrl,
        mimeType: document.request.mimeType,
        callbackUrl: config.tappUIAPIHost,
      },
    };
    const url = config.preProcessorAPIHost + constants.preprocessorURL;
    console.log(`Add Document API Called Preprocessor URL - ${url} at ${new Date().toUTCString()} with below Payload:- `);
    console.log(requestBody);

    request(
      {
        headers: {
          "content-type": "application/json",
          "Authorization": config.authorizationKey
        },
        method: "POST",
        url: url,
        body: JSON.stringify(requestBody),
      },
      (error, response, body) => {
        console.log(`Preprocessor Result retreived at ${new Date().toUTCString()}, Err:- ${error} Response:- ${response} Body:- ${body}`);
        let payload = {};
        try {
          payload = JSON.parse(body);
        } catch (error) {
          payload = null;
        }
        if (error) {
          payload = {
            result: {
              status: "FAILED",
              documentType: 'Invoice',
              lastUpdatedBy: 'system',
              lastProcessedOn: util.generateTimestamp(),
              stage: 'PRE-PROCESSOR',
              extraction_completed: 1,
              statusMsg: 'Failed in preprocessing',
            },
          };
          util.handleServerError(null, payload, callback);
        } else {
          util.handleServerError(error, payload, callback);
        }
      }
    );
  }

  /* Method to submit invoice for extraction through the TAPP service. Following are the step performed in the Method sequentially.
   *
   * 1. Calls the external extraction/submit with the tiffurl returned in the asynchronous response by preprocessor, which returns response 2times
   *  a) synchronous  response -> this updates the document metadata as running or inprogress status, for exact status names refer github wiki
   *  b) asynchronous  response -> this updates the document metadata after preprocessor finishes initial extraction of invoiceNo & vendorId etc & updates the doucment metadata status as 'EXTRACTION_DONE' , for exact status names refer github wiki
   * 2. Returns an error if API is not responding or the API response is not OK
   */
  callExtraction(document, callback) {
    const requestBody = {
      id: "api.extraction.engine.submit",
      ver: "1.0",
      ts: new Date().getTime(),
      params: {
        msgid: uuid.v4(),
      },
      request: {
        documentId: document.documentId,
        location: document.tiffUrl,
        mimeType: "image/tiff", // hard coding to tiff for now
        callbackUrl: config.tappUIAPIHost,
      },
    };
    request(
      {
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
        url: config.extractionAPIHost + constants.extractionEngineURL,
        body: JSON.stringify(requestBody),
      },
      (error, response, body) => {
        let payload;
        try {
          payload = JSON.parse(body);
        } catch (err) {
          payload = null;
        }
        if (error) {
          payload = {
            result: {
              status: "FAILED",
              lastUpdatedBy: 'system',
              lastProcessedOn: util.generateTimestamp(),
              stage: 'EXTRACTION',
              extraction_completed: 1,
              statusMsg: 'Failed in extraction',
            },
          };
          util.handleServerError(null, payload, callback);
        } else {
          util.handleServerError(error, payload, callback);
        }
      }
    );
  }

  /* API to submit invoice for extraction through the TAPP service. Following are the step performed in the Method sequentially.
   *
   * 1. Validate the request
   * 2. Find if the document reference given exists
   * 3. Calls callExtraction method above which is being used in multiple places if status is 'READY_FOR_EXTRACTION'
   */
  extraction(req, res) {
    let reqData = req.body.request;
    const that = this;
    const apiParams = {
      id: "api.extraction.submit",
      msgid: req.body.params ? req.body.params.msgid : "",
    };

    if (
      !(req.body && req.body.request && typeof req.body.request == "object")
    ) {
      apiParams.err = "Invalid Request";
      resUtil.BADREQUEST(res, apiParams, {});
      return;
    }

    async.waterfall(
      [
        function (callback) {
          validator.validate(reqData, "extraction", callback);
        },
        function (value1, callback) {
          docCollection.findOne(
            {
              documentId: value1.documentId,
            },
            function (err, document) {
              util.handleServerError(err, document, callback);
            }
          );
        },
        function (value2, callback) {
          if (value2.status && value2.status == "READY_FOR_EXTRACTION") {
            that.callExtraction(value2, callback);
          } else {
            callback(
              {
                status: 400,
                err: "BAD_REQUEST",
                errmsg: "wrong status for extraction",
              },
              null
            );
          }
        },
        function (value3, callback) {
          if (value3 && value3.result) {
            value3.result.documentId = reqData.documentId;
            const filter = {
              documentId: value3.result.documentId,
            };

            dbutil.updateInDB(docCollection, filter, value3.result, callback);
          }
        },
      ],
      function (err, resultData) {
        if (err) {
          resUtil.handleError(req, res, err);
          return;
        }

        if (!resultData) {
          resUtil.NOTFOUND(res, apiParams, {});
          return;
        }

        resUtil.OK(res, apiParams, resultData);
        return;
      }
    );
  }

  /* API to submit invoice for preprocessing through the TAPP service. Following are the step performed in the Method sequentially.
   *
   * 1. Validate the request
   * 2. Find if the document reference given exists
   * 3. Calls preprocessor method above which is being used in multiple places
   *
   * **Note: pending task if workflow is changed
   * 1. as the preprocessor API is not being used directly anywhere, this is a placeholder.
   * 2. Need a status validator which checks if status is correct for the workflow step the document is in to allow/restrict this action for the specified document
   */
  preProcess(req, res) {
    let reqData = req.body.request;
    const that = this;
    const apiParams = {
      id: "api.preprocess.submit",
      msgid: req.body.params ? req.body.params.msgid : "",
    };

    if (
      !(req.body && req.body.request && typeof req.body.request == "object")
    ) {
      apiParams.err = "Invalid Request";
      resUtil.BADREQUEST(res, apiParams, {});
      return;
    }

    async.waterfall(
      [
        function (callback) {
          validator.validate(reqData, "preProcessing", callback);
        },
        function (value1, callback) {
          docCollection.findOne(
            {
              documentId: value1.documentId,
            },
            function (err, document) {
              util.handleServerError(err, document, callback);
            }
          );
        },
        function (value2, callback) {
          that.callPreprocessor(req.body, callback);
        },
        function (value3, callback) {
          if (value3 && value3.result) {
            value3.result.documentId = reqData.documentId;
            const filter = {
              documentId: value3.result.documentId,
            };

            dbutil.updateInDB(docCollection, filter, value3.result, callback);
          }
        },
      ],
      function (err, resultData) {
        if (err) {
          resUtil.handleError(req, res, err);
          return;
        }

        if (!resultData) {
          resUtil.NOTFOUND(res, apiParams, {});
          return;
        }

        resUtil.OK(res, apiParams, resultData);
        return;
      }
    );
  }

  /* API which calls preprocessor/knowninvoice which stores information on whether a sample invoice was uploaded through the TAPP service. Following are the step performed in the Method sequentially.
   *
   * to be used while
   * 1. Uploading a sample invoice for a vendor & updating the vendor data
   */
  getTiffInvoiceURL(req, res) {
    let reqData = req.body.request;
    const that = this;
    const apiParams = {
      id: "api.preprocess.convertToTiff",
      msgid: req.body.params ? req.body.params.msgid : "",
    };

    if (
      !(req.body && req.body.request && typeof req.body.request == "object")
    ) {
      apiParams.err = "Invalid Request";
      resUtil.BADREQUEST(res, apiParams, {});
      return;
    } else {
      // starts here
      async.waterfall(
        [
          function (callback) {
            validator.validate(reqData, "getTiffInvoiceURL", callback);
          },
          function (value1, callback) {
            //getInvoiceTiffURL
            request(
              {
                headers: {
                  "content-type": "application/json",
                },
                method: "POST",
                url: config.preProcessorAPIHost + constants.convertToTiff,
                body: JSON.stringify(req.body),
              },
              (error, response, body) => {
                let payload;
                try {
                  payload = JSON.parse(body);
                } catch (err) {
                  payload = null;
                } finally {
                  if (error) {
                    callback(error, null);
                  } else if (payload) {
                    callback(null, payload);
                  } else {
                    const errorObj = {
                      status: 400,
                      err: "BAD_REQUEST",
                      errmsg: "Failed to convert to tiff url",
                    };
                    resUtil.BADREQUEST(res, apiParams, errorObj);
                  }
                }
              }
            );
          },
        ],
        function (err, resultData) {
          if (err) {
            res.status(500).send(err);
            // resUtil.handleError(req, res, err);
            return;
          }

          res.status(200).send(resultData);
          return;
        }
      );
      //ends here
    }
  }

  /* Method to be called whenever the document metadata is updated as 'REVIEW_COMPLETED'
      through the TAPP service. Following are the step performed in the Method sequentially.
   * 
   * 1. Call the external API with the payload specified in the wiki for TAPP-UI which syncs the local DB for UIPath with the tapp DB used for tapp
   * 
   * to be used while 
   * 1. Adding a new document result by extraction service after extraction is complete
   * 2. Updating document result while review submit 
   * 
   * In both the cases mentioned above the status of the document is updated as 'REVIEW_COMPLETED'
   */
  async callAfterReviewComplete(documentResult) {
    const requestBody = {
      id: "api.extraction.result.submit",
      ver: "1.0",
      ts: new Date().getTime(),
      params: {
        msgid: uuid.v4(),
      },
      request: documentResult,
    };

    request(
      {
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
        url: config.reviewSubmitURL,
        body: JSON.stringify(requestBody),
      },
      (error, response, body) => {
        let payload;
        try {
          payload = JSON.parse(body);
        } catch (err) {
          payload = null;
        }
        if (error) {
          logger.error("error while submitting document result");
        } else {
          logger.info(
            "successfully called external service after submitting the changes n document result"
          );
        }
      }
    );
  }

  /* Method to submit query for a document result through the TAPP service.
   *  Following are the step performed in the Method sequentially.
   *
   * 1. Calls the external sharepoint API to register a query which returns response two times
   *  a) synchronous  response -> this returns the instant status
   *  b) asynchronous  response -> this updates the document result after a respondant responds to the specific query
   * 2. Returns an error if API is not responding or the API response is not OK
   */
  addQueryForResult(document, callback) {
    const requestBody = document;
    let url = config.queryAddWorkflowAPIURL + "?";
    for (let key in requestBody) {
      url = url + key + "=" + requestBody[key] + "&";
    }
    url =
      url.charAt(url.length - 1) === "&" ? url.slice(0, url.length - 1) : url;
    request(
      {
        headers: {
          "content-type": "application/json",
        },
        method: "GET",
        url: url,
        dataType: "json",
        // body: JSON.stringify(requestBody)
      },
      (error, response, body) => {
        let parsedBody;
        let payload = {};
        try {
          parsedBody = JSON.parse(body);
        } catch (error) {
          payload = null;
        }
        if (error) {
          payload = {
            result: {
              status: "FAILED",
            },
          };
          util.handleServerError(null, payload, callback);
        } else {
          if (
            parsedBody &&
            parsedBody.length &&
            parsedBody[0].Status === "Success"
          ) {
            payload = parsedBody[0];
          } else {
            payload = null;
          }
          util.handleServerError(error, payload, callback);
        }
      }
    );
  }

  /* Method to delete a query for a document result through the TAPP service.
   *  Following are the step performed in the Method sequentially.
   *
   * 1. Calls the external sharepoint API to  delete
   * the query based on documentId & queryId
   * 2. Returns an error if API is not responding or the API response is not OK
   * 3. Returns success, if request was successful.
   */
  deleteQueryForResult(document, callback) {
    const requestBody = document;
    let url = config.queryDeleteWorkflowAPIURL + "?";
    for (let key in requestBody) {
      url = url + key + "=" + requestBody[key] + "&";
    }
    url =
      url.charAt(url.length - 1) === "&" ? url.slice(0, url.length - 1) : url;

    if (!(requestBody.documentId && requestBody.queryId)) {
      const payload = {
        result: {
          status: "FAILED",
        },
      };
      util.handleServerError(null, payload, callback);
    }
    request(
      {
        headers: {
          "content-type": "application/json",
        },
        method: "GET",
        url: url,
        dataType: "json",
        // body: JSON.stringify(requestBody)
      },
      (error, response, body) => {
        let payload = {};
        let parsedBody = {};
        try {
          parsedBody = JSON.parse(body);
        } catch (error) {
          payload = null;
        }
        if (error) {
          payload = {
            result: {
              status: "FAILED",
            },
          };
          util.handleServerError(null, payload, callback);
        } else {
          if (
            parsedBody &&
            parsedBody.length &&
            parsedBody[0].Status === "Success"
          ) {
            payload = parsedBody[0];
          } else {
            payload = null;
          }
          util.handleServerError(error, payload, callback);
        }
      }
    );
  }
}

module.exports = new ExternalService(config);
