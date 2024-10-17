const _ = require("lodash");
const async = require("async");
const config = require("../config");
const dbutil = require("../util/db");
const util = require("../util/util");
const resUtil = require("../util/resUtil");
const validator = require("../util/validatorUtil");
const crypto = require("crypto-js");
const uuid = require("uuid");
const moment = require("moment");

const db = dbutil.getDatabase(config.mongoDBName);

const tokenCollection = db.collection("tokens");
const logger = require("../logger/logger");

class TokenService {
  constructor(config) {
    this.config = config;
  }

  /*
   * Method to create a new access token for the user through the TAPP service. Following are the step performed in the API sequentially.
   * 1. Create a new token with expiry set for 2 hrs by default using uuid & moment.js
   * 2. Insert a new document for the created token
   */
  createToken(document, callback) {
    let item = tokenCollection
      .find({})
      .sort({
        tokenId: -1
      })
      .limit(1)
      .toArray(function (err, docs) {
        let newToken;
        if (docs && docs.length) {
          newToken = {
            tokenId: parseInt(parseInt(docs[0].tokenId) + 1),
            token: uuid.v4(),
            userId: document.userId,
            role: document.role,
            userCreatedBy: document.role == 'viewer' ? document.userCreatedBy : undefined,
            createdOn: util.generateTimestamp(),
            expiryDueOn: util.generateTimestamp(
              moment(util.generateTimestamp())
                .add(config.SESSION_EXPIRE_TIME, config.SESSION_EXPIRE_TIME_UNIT)
                .toDate()
            ),
            disabled: false
          };
        } else {
          newToken = {
            tokenId: 1,
            token: uuid.v4(),
            userId: document.userId,
            role: document.role,
            userCreatedBy: document.role == 'viewer' ? document.userCreatedBy : undefined, // added new for bot user
            createdOn: util.generateTimestamp(),
            expiryDueOn: util.generateTimestamp(
              moment(util.generateTimestamp())
                .add(config.SESSION_EXPIRE_TIME, config.SESSION_EXPIRE_TIME_UNIT)
                .toDate()
            ),
            disabled: false
          };
        }

        tokenCollection.insertOne(newToken, function (err, tokenDoc) {
          if (err) {
            callback(
              {
                status: 500,
                err: "INTERNAL_SERVER_ERROR",
                errmsg: "error while creating authentication token"
              },
              null
            );
          } else if (tokenDoc) {
            const result = document;
            result.token = tokenDoc.ops[0].token;
            callback(null, result);
          } else {
            callback(
              {
                status: 404,
                err: "NOTFOUND",
                errmsg: "User Not Found"
              },
              null
            );
          }
        });
      });
  }

  /*
 * Method to validate access token through the TAPP service. Following are the step performed in the API sequentially.
 * 1. Find  the token by token value
 * 2. Check if the token has expired or still active
 * 3. Delete the token if it has expired
 */
  validateToken(token, callback) {
    const that = this;
    tokenCollection.findOne(
      {
        token: token
      },
      function (err, result) {
        if (err) {
          callback(
            {
              status: 500,
              err: "INTERNAL_SERVER_ERROR",
              errmsg: "error while finding the user"
            },
            null
          );
        } else if (
          result &&
          result.expiryDueOn &&
          result.expiryDueOn >= util.generateTimestamp()
        ) {
          callback(null, result);
        } else {
          that.deleteToken(token);
          callback(
            {
              status: 404,
              err: "NOTFOUND",
              errmsg: "User Not Found",
              reason: 'session expired'
            },
            null
          );
        }
      }
    );
  }

  /*
  * Method to delete access token through the TAPP service. Following are the step performed in the API sequentially.
  * 1. Find  the token by token value & deletes
  * 
  * To be used while 
  * 1. Validating token or anywhere when an expired token is found, delete the document 
  */
  async deleteToken(token) {
    return tokenCollection
      .findOneAndDelete({
        token
      })
      .then(document => {
        if (document && document["lastErrorObject"]["n"]) {
          logger.info("token: " + token + " deleted successfully");
          return true;
        } else {
          logger.error("error while deleting old token", err);
          return false;
        }
        return true;
      })
      .catch(err => {
        return false;
      });
  }
}

module.exports = new TokenService(config);
