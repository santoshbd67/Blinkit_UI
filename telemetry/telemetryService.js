var Telemetry = require('./telemetryInterface.js')

var default_config = {
}

function telemetryService (config) {
    this.init(config);
}

/**
 * This function is used to initialize telemetry
 * @param {object} config
 */
telemetryService.prototype.init = function (config) {
  this.config = Object.assign({}, config, default_config)
  Telemetry.initialize(this.config)
}

/**
 * for audit event
 * data object have these properties {'edata', context', 'object', 'tags'}
 */
telemetryService.prototype.audit = function (data) {
  return Telemetry.audit(data.data, {
    context: data.context,
    object: data.object,
    uid: data.uid,
    tags: data.tags
  })
}

/**
 * This function is use to get audit event data
 * @param {Array} props
 * @param {string} state
 * @param {string} prestate
 */
telemetryService.prototype.auditEventData = function (props, state, prestate, duration) {
  const auditEventData = {
    props: props,
    state: state,
    prevstate: prestate,
    duration: duration
  }
  return JSON.parse(JSON.stringify(auditEventData))
}

/**
 * This function helps to get context data for event.
 * @param {channel, pdata, env, cdata, rollup} data
 */
telemetryService.prototype.getContextData = function (data) {
  let cObj = {}
  cObj.channel = data.channel
  cObj.pdata = data.pdata
  cObj.env = data.env
  cObj.cdata = data.cdata
  cObj.rollup = data.rollup
  cObj.did = data['did'] || ''
  return JSON.parse(JSON.stringify(cObj))
}


/**
 * This function return pdata object
 * @param {string} id
 * @param {string} version
 * @param {string} pid
 */
telemetryService.prototype.pData = function (id, version, pid) {
  if (!id || !version) {
    return 'Required params are missing'
  }
  const pData = {
    id: id,
    pid: pid,
    ver: version
  }
  return JSON.parse(JSON.stringify(pData))
}

/**
 * This function return object data
 * @param {id, type, ver, rollup} data
 */
telemetryService.prototype.getObjectData = function (data) {
  let obj = {}
  if (data && (!data.id || !data.type)) {
    return 'Required params are missing'
  }
  obj.id = data.id
  obj.type = data.type
  return JSON.parse(JSON.stringify(obj))
}

module.exports = telemetryService
