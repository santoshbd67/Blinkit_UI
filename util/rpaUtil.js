const _ = require("lodash");
const async = require("async");
const config = require("../config");
const dbutil = require("../util/db");
const request = require("request");

const db = dbutil.getDatabase(config.mongoDBName);
const settingsColl = db.collection("settings");
const docCollection = db.collection("document_metadata");

class RPAUtil {
  getAccessToken(callback) {
    let instance = this;
    settingsColl.findOne({ settingId: "accessToken" }, function(err, doc) {
      if (err) {
        callback("Error retrieving access token from mongodb:" + err);
      } else {
        if (doc && doc.settingValue) callback(null, doc.settingValue);
        else instance.refreshToken(callback);
      }
    });
  }

  getJobLogs(jobKey, accessToken, cb) {
    let instance = this;
    var headers = { Authorization: "Bearer " + accessToken };
    var url = config.rpaOrchestratorDomain + "/";
    if (config.rpaIntegrationMode === "cloud") {
      headers["X-UIPATH-TenantName"] = config.rpaTenantLogicalName;
      headers["X-UIPATH-OrganizationUnitId"] = config.rpaTenantOrganizationID;
      url =
        url +
        config.rpaAccountLogicalName +
        "/" +
        config.rpaTenantLogicalName +
        "/";
    }
    url = url + "odata/RobotLogs";

    async.waterfall(
      [
        function(callback) {
          settingsColl.findOne(
            { settingId: jobKey, settingType: "lastsynctime" },
            function(err, result) {
              callback(err, result);
            }
          );
        },
        function(settings, callback) {
          if (settings && settings.settingValue) {
            // url =
            //   url +
            //   "?$filter=(JobKey eq " +
            //   jobKey +
            //   " and TimeStamp gt " +
            //   settings.settingValue +
            //   ")";
            url = url + "?$filter=(JobKey eq " + jobKey + ")";
          } else url = url + "?$filter=(JobKey eq " + jobKey + ")";
          request(
            { headers: headers, method: "GET", url: url },
            (error, response, body) => {
              if (
                error ||
                response.statusCode === 500 ||
                response.statusCode === 401
              ) {
                if (body && instance.hasAccessTokenFailed(body)) {
                  callback(null, true, body);
                } else {
                  callback("Error fetching robot logs:" + body);
                }
              } else {
                callback(null, false, body);
              }
            }
          );
        },
        function(accessTokenExpired, body, callback) {
          if (accessTokenExpired) {
            instance.refreshToken(callback);
          } else {
            callback(undefined, false, body);
          }
        },
        function(refreshedToken, body, callback) {
          if (refreshedToken) {
            callback = body;
            headers["Authorization"] = refreshedToken;
            request(
              { headers: headers, method: "GET", url: url },
              (error, response, body) => {
                if (
                  error ||
                  response.statusCode === 500 ||
                  response.statusCode === 401
                ) {
                  callback("Error fetching job logs:" + error, body);
                } else {
                  callback(null, body);
                }
              }
            );
          } else {
            callback(null, body);
          }
        }
      ],
      function(err, result) {
        cb(err, jobKey, result);
      }
    );
  }

  hasAccessTokenFailed(body) {
    let resp = JSON.parse(body);
    if (resp.message === "You are not authenticated!") {
      return true;
    } else {
      return false;
    }
  }

  refreshToken(cb) {
    async.waterfall(
      [
        function(callback) {
          if (config.rpaIntegrationMode === "cloud") {
            let headers = {
              "X-UIPATH-TenantName": config.rpaAccountLogicalName,
              "Content-Type": "application/json"
            };
            let url = config.rpaAuthenticationDomain + "/oauth/token";

            let body = {
              grant_type: "refresh_token",
              client_id: config.rpaClientId,
              refresh_token: config.rpaRefreshToken
            };

            request(
              {
                headers: headers,
                method: "POST",
                url: url,
                body: JSON.stringify(body)
              },
              (error, response, body) => {
                if (error || response.statusCode === 500) {
                  callback("Error while refreshing token:" + body);
                } else {
                  let bodyJson = JSON.parse(body);
                  callback(null, bodyJson.access_token);
                }
              }
            );
          } else {
            var headers = { "Content-Type": "application/json" };
            var url =
              config.rpaOrchestratorDomain + "/api/account/authenticate";
            let body = {
              tenancyName: config.rpaTenantName,
              usernameOrEmailAddress: config.rpaUserName,
              password: config.rpaPassword
            };
            request(
              {
                headers: headers,
                method: "POST",
                url: url,
                body: JSON.stringify(body)
              },
              (error, response, body) => {
                if (error || response.statusCode === 500) {
                  callback("Error while refreshing token:" + body);
                } else {
                  let bodyJson = JSON.parse(body);
                  callback(null, bodyJson.result);
                }
              }
            );
          }
        },
        function(token, callback) {
          settingsColl.findOneAndUpdate(
            { settingId: "accessToken" },
            {
              $set: {
                settingValue: token
              }
            },
            {
              upsert: true
            },
            function(err, result) {
              if (err) {
                callback("Error updating refresh token in DB:" + err);
              } else {
                callback(null, token);
              }
            }
          );
        }
      ],
      function(err, result) {
        cb(err, result);
      }
    );
  }

  processJobLogs(jobKey, jobLogsBody, cb) {
    let jobLogs = undefined;
    try {
      jobLogs = JSON.parse(jobLogsBody);
    } catch (error) {
      cb("Error occured while parsing robot logs:" + error, jobLogsBody);
      return;
    }

    if (jobLogs && jobLogs["@odata.count"] > 0) {
      let timestamp = _.orderBy(jobLogs["value"], ["TimeStamp"], ["desc"])[0][
        "TimeStamp"
      ];
      let logs = _.filter(jobLogs["value"], { Level: "Info" });
      let rawMessages = _.map(logs, "RawMessage");
      let messages = _.map(rawMessages, function(rawMessage) {
        return JSON.parse(rawMessage);
      });
      let orderedMessages = _.orderBy(
        messages,
        ["documentID", "ts"],
        ["asc", "asc"]
      );

      let finalMessages = orderedMessages.filter(m => {
        return m.message.indexOf("documentID") > -1;
      });

      async.each(
        finalMessages,
        function(msg, callback) {
          msg = JSON.parse(msg.message);

          docCollection.findOneAndUpdate(
            { documentId: msg.documentID },
            {
              $set: {
                status: msg.rpaStatus,
                stage:'RPA',
                rpaStatus: msg.rpaStatus,
                statusMsg: msg.statusMessage,
                rpaStage: msg.rpaStage,
                IsLastRpaStage: msg.IsLastRpaStage,
                isNextStageManual: msg.IsNextStageManual,
                lastUpdatedOn: parseInt(msg.ts)
              }
            },
            function(err, result) {
              callback(err, result);
            }
          );
        },
        function(err) {
          if (err) {
            cb(
              "Error occured while updating document metadata from rpa log:" +
                err,
              jobLogsBody
            );
          } else {
            settingsColl.findOneAndUpdate(
              { settingId: jobKey, settingType: "lastsynctime" },
              {
                $set: {
                  settingValue: timestamp
                }
              },
              {
                upsert: true
              },
              function(err, result) {
                cb(err, "Updated document status from logs");
              }
            );
          }
        }
      );
    } else {
      cb(null);
    }
  }
}

module.exports = new RPAUtil();
