const CryptoJS = require('crypto-js')

/**
 * Telemetry Library
 */

var Telemetry = (function() {
    this.telemetry = function() {};
    var instance = function() {};
    var telemetryInstance = this;
    this.telemetry.initialized = false;
    this.telemetry.config = {};
    this.telemetry._version = "1.0";
    this._defaultValue = {},
        this.telemetryEnvelop = {
            "eid": "",
            "ets": "",
            "ver": "",
            "mid": "",
            "uid": "",
            "context": {},
            "object": {},
            "tags": [],
            "data": ""
        }
    this._globalContext = {
        "pdata": { id: "com.tapp", ver: "1.0", pid: "" },
        "sid": "",
        "cdata": []
    };
    this._globalObject = {};
    this._globalUid = "";
    
    /**
     * Which is used to initialize the telemetry event
     * @param  {object} config - Configurations for the telemetry lib to initialize the service. " Example: config = { batchsize:10,host:"" } "
     */
    this.telemetry.initialize = function(config) {
        instance.init(config);
    }    

    /**
     * Which is used to log the audit telemetry event.
     * @param  {object} data       [data which is need to pass in this event ex: {"type":"player","mode":"ContentPlayer","pageid":"splash"}]
     * @param  {object} options    [It can have `context, object, actor` can be explicitly passed in this event]
     */
    this.telemetry.audit = function(data, options) {
        instance.updateValues(options);
        return instance.getEvent('AUDIT', data);
    }

    /**
     * Which is used to know the whether telemetry is initialized or not.
     * @return {Boolean}
     */
    this.telemetry.isInitialized = function() {
        return Telemetry.initialized;
    }

    /**
     * Which is used to reset the current context
     * @param  {object} context [Context value]
     */
    this.telemetry.resetContext = function(context) {
        telemetryInstance._currentContext = context || {};
    }

    /**
     * Which is used to reset the current object value.
     * @param  {object} object [Object value]
     */
    this.telemetry.resetObject = function(object) {
        telemetryInstance._currentObject = object || {};
    },

    /**
     * Which is used to reset the current actor value.
     * @param  {object} object [Object value]
     */
    this.telemetry.resetTags = function(tags) {
        telemetryInstance._currentTags = tags || [];
    }

    /**
     * Which is used to initialize the telemetry in globally.
     * @param  {object} config     [Telemetry configurations]
     */
    instance.init = function(config) {
        if (Telemetry.initialized) {
            console.log("Telemetry is already initialized..");
            return;
        }
        !config && (config = {})
        Telemetry.config = Object.assign(_defaultValue, config);
        Telemetry.initialized = true;
        instance.updateConfigurations(config);
        console.info("Telemetry is initialized.")
    }

    /**
     * Which is used to get the telemetry envelop data
     * @param  {string} eventId [Name of the event]
     * @param  {object} data    [Event data]
     * @return {object}         [Telemetry envelop data]
     */
    instance.getEvent = function(eventId, data) {
        telemetryInstance.telemetryEnvelop.eid = eventId;
        // timeDiff (in sec) is diff of server date and local date
        telemetryInstance.telemetryEnvelop.ets = (new Date()).getTime() + ((Telemetry.config.timeDiff*1000) || 0);
        telemetryInstance.telemetryEnvelop.ver = Telemetry._version;
        telemetryInstance.telemetryEnvelop.context = Object.assign({}, instance.getGlobalContext(), instance.getUpdatedValue('context'));
        telemetryInstance.telemetryEnvelop.object = Object.assign({}, instance.getGlobalObject(), instance.getUpdatedValue('object'));
        telemetryInstance.telemetryEnvelop.uid = instance.getUpdatedValue('uid');
        telemetryInstance.telemetryEnvelop.tags = Object.assign([], Telemetry.config.tags, instance.getUpdatedValue('tags'));
        telemetryInstance.telemetryEnvelop.data = data;
        telemetryInstance.telemetryEnvelop.mid = eventId + ':' + CryptoJS.MD5(JSON.stringify(telemetryInstance.telemetryEnvelop)).toString();
        return telemetryInstance.telemetryEnvelop;
    }

    /**
     * Which is used to assing to globalObject and globalContext value from the telemetry configurations.
     * @param  {object} config [Telemetry configurations]
     */
    instance.updateConfigurations = function(config) {
        config.object && (telemetryInstance._globalObject = config.object);
        config.uid && (telemetryInstance._globalUid = config.uid);
        config.sid && (telemetryInstance._globalContext.sid = config.sid);
        config.cdata && (telemetryInstance._globalContext.cdata = config.cdata);
        config.pdata && (telemetryInstance._globalContext.pdata = config.pdata);
    }

    /**
     * Which is used to get the current updated global context value.
     * @return {object}
     */
    instance.getGlobalContext = function() {
        return telemetryInstance._globalContext;
    }

    /**
     * Which is used to get the current global object value.
     * @return {object}
     */
    instance.getGlobalObject = function() {
        return telemetryInstance._globalObject;
    }

    /**
     * Which is used to get the current global uid value.
     * @return {object}
     */
    instance.getGlobalUid = function() {
        return telemetryInstance._globalUid;
    }

    /**
     * Which is used to update the both context and object vlaue.
     * For any event explicitly context and object value can be passed.
     * @param  {object} context [Context value object]
     * @param  {object} object  [Object value]
     */
    instance.updateValues = function(options) {
        if (options) {
            options.context && (telemetryInstance._currentContext = options.context);
            options.object && (telemetryInstance._currentObject = options.object);
            options.tags && (telemetryInstance._currentTags = options.tags);
            options.uid && (telemetryInstance._currentUid = options.uid);
        }
    }

    /**
     * Which is used to get the value of 'context','actor','object'
     * @param  {string} key [ Name of object which we is need to get ]
     * @return {object}
     */
    instance.getUpdatedValue = function(key) {
        switch (key.toLowerCase()) {
            case 'context':
                return telemetryInstance._currentContext || {};
                break;
            case 'object':
                return telemetryInstance._currentObject || {};
                break;
            case 'uid':
                return telemetryInstance._currentUid || telemetryInstance._globalUid;
                break;
            case 'tags':
                return telemetryInstance._currentTags || [];
                break;
        }
    }

    /**
     * Which is used to support for lower end deviecs.
     * If any of the devices which is not supporting ECMAScript 6 version
     */
    instance.objectAssign = function() {
        Object.assign = function(target) {
            'use strict';
            if (target == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }

            target = Object(target);
            for (var index = 1; index < arguments.length; index++) {
                var source = arguments[index];
                if (source != null) {
                    for (var key in source) {
                        if (Object.prototype.hasOwnProperty.call(source, key)) {
                            target[key] = source[key];
                        }
                    }
                }
            }
            return target;
        }
    }
    
    if (typeof Object.assign != 'function') {
        instance.objectAssign();
    }

    return this.telemetry;
})();


if (typeof module != 'undefined') {
    module.exports = Telemetry;
}