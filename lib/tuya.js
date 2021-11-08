const qs = require('qs')
const crypto = require('crypto')
const axios = require('axios')

const { TUYA_HOST: host, TUYA_CLIENT_ID: accessKey, TUYA_CLIENT_SECRET: secretKey } = process.env

if (!host) throw new Error('environment variable TUYA_HOST not set.')
if (!accessKey) throw new Error('environment variable TUYA_CLIENT_ID not set.')
if (!secretKey) throw new Error('environment variable TUYA_CLIENT_SECRET not set.')

const config = { host, accessKey, secretKey }
let token

/**
 * HMAC-SHA256 crypto function
 * @param {string} str
 */
const encryptStr = str => {
  return crypto.createHmac('sha256', config.secretKey).update(str, 'utf8').digest('hex').toUpperCase()
}

const getToken = async () => {
  const method = 'GET'
  const timestamp = Date.now().toString()
  const signUrl = '/v1.0/token?grant_type=1'
  const contentHash = crypto.createHash('sha256').update('').digest('hex')
  const stringToSign = [method, contentHash, '', signUrl].join('\n')
  const signStr = config.accessKey + timestamp + stringToSign

  const headers = {
    t: timestamp,
    sign_method: 'HMAC-SHA256',
    client_id: config.accessKey,
    sign: await encryptStr(signStr)
  }
  const { data: login } = await httpClient.get('/v1.0/token?grant_type=1', { headers })
  if (!login || !login.success) {
    throw Error(`Authorization Failed: ${login.msg}`)
  }
  token = login.result.access_token
  return token
}

/**
 * Request signature, which can be passed as headers
 * @param path
 * @param method
 * @param query
 * @param body
 */
const getRequestSign = async (path, method, query = {}, body = {}) => {
  const t = Date.now().toString()
  const [uri, pathQuery] = path.split('?')
  const queryMerged = Object.assign(query, qs.parse(pathQuery))
  const sortedQuery = {}
  Object.keys(queryMerged).sort().forEach(i => (sortedQuery[i] = query[i]))

  const querystring = decodeURIComponent(qs.stringify(sortedQuery))
  const url = querystring ? `${uri}?${querystring}` : uri
  const contentHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')
  const stringToSign = [method, contentHash, '', url].join('\n')
  const signStr = config.accessKey + token + t + stringToSign
  return {
    t,
    path: url,
    client_id: config.accessKey,
    sign: await encryptStr(signStr),
    sign_method: 'HMAC-SHA256',
    access_token: token
  }
}

const httpClient = axios.create({
  baseURL: config.host,
  timeout: 5 * 1e3
})

const query = async (method, url, body) => {
  if (!token) token = await getToken()
  const reqHeaders = await getRequestSign(url, method, {}, body)
  const { data } = await httpClient.request({
    method,
    data: body || {},
    params: {},
    headers: reqHeaders,
    url: reqHeaders.path
  })
  if (!data || !data.success) {
    throw Error(`Request Failed: ${data.msg}`)
  }
  return data
}

const switchOnOff = (deviceId, enable, idx) => {
  const code = idx ? `switch_${idx}` : 'switch'
  return query('POST', `/v1.0/devices/${deviceId}/commands`, {
    commands: [{
      code: code,
      value: enable
    }]
  })
}

/**
 * Switch on the plug
 * @param {string} deviceId the device ID
 * @param {number?} idx the number of the switch, of not set the status of `switch` will be searched, which if for single plugs
 * @returns {Promise}
 */
exports.switchOn = (deviceId, idx) => switchOnOff(deviceId, true, idx)
/**
 * Switch off the plug
 * @param {string} deviceId the device ID
 * @param {number?} idx the number of the switch, of not set the status of `switch` will be searched, which if for single plugs
 * @returns {Promise}
 */
exports.switchOff = (deviceId, idx) => switchOnOff(deviceId, false, idx)

/**
 * @param {string} deviceId
 * @returns {Promise}
 */
exports.getDeviceInfo = deviceId => {
  return query('GET', `/v1.0/devices/${deviceId}`)
}

/**
 * @param {string} deviceId
 * @param {number?} idx the number of the switch, of not set the status of `switch` will be searched, which if for single plugs
 * @returns {Promise.<boolean>}
 */
exports.getDeviceStatus = async (deviceId, idx) => {
  const code = idx ? `switch_${idx}` : 'switch'
  const res = await query('GET', `/v1.0/devices/${deviceId}/status`)
  return (res.result.find(e => e.code === code) || {}).value
}
