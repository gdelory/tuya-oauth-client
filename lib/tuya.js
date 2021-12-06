const qs = require('qs')
const crypto = require('crypto')
const axios = require('axios')

const { TUYA_HOST, TUYA_CLIENT_ID, TUYA_CLIENT_SECRET } = process.env

module.exports = class Tuya {
  constructor(args) {
    this.config = {
      host: args.baseUrl || TUYA_HOST,
      accessKey: args.clientId || TUYA_CLIENT_ID,
      secretKey: args.clientSecret || TUYA_CLIENT_SECRET
    }

    if (!this.config.host) throw new Error('Base URL must be set either using the --baseUrl command line option or the TUYA_HOST environment variable.')
    if (!this.config.accessKey) throw new Error('Client ID must be set either using the --clientId command line option or the TUYA_CLIENT_ID environment variable.')
    if (!this.config.secretKey) throw new Error('Client secret must be set either using the --clientSecret command line option or the TUYA_CLIENT_SECRET environment variable.')

    this.httpClient = axios.create({
      baseURL: this.config.host,
      timeout: 5 * 1e3
    })
  }

  /**
   * HMAC-SHA256 crypto function
   * @param {string} str
   */
  encryptStr(str) {
    return crypto.createHmac('sha256', this.config.secretKey).update(str, 'utf8').digest('hex').toUpperCase()
  }

  async getToken() {
    const method = 'GET'
    const timestamp = Date.now().toString()
    const signUrl = '/v1.0/token?grant_type=1'
    const contentHash = crypto.createHash('sha256').update('').digest('hex')
    const stringToSign = [method, contentHash, '', signUrl].join('\n')
    const signStr = this.config.accessKey + timestamp + stringToSign

    const headers = {
      t: timestamp,
      sign_method: 'HMAC-SHA256',
      client_id: this.config.accessKey,
      sign: await this.encryptStr(signStr)
    }
    const { data: login } = await this.httpClient.get('/v1.0/token?grant_type=1', { headers })
    if (!login || !login.success) {
      throw Error(`Authorization Failed: ${login.msg}`)
    }
    this.token = login.result.access_token
    return this.token
  }

  /**
   * Request signature, which can be passed as headers
   * @param path
   * @param method
   * @param query
   * @param body
   */
  async getRequestSign(path, method, query = {}, body = {}) {
    const t = Date.now().toString()
    const [uri, pathQuery] = path.split('?')
    const queryMerged = Object.assign(query, qs.parse(pathQuery))
    const sortedQuery = {}
    Object.keys(queryMerged).sort().forEach(i => (sortedQuery[i] = query[i]))

    const querystring = decodeURIComponent(qs.stringify(sortedQuery))
    const url = querystring ? `${uri}?${querystring}` : uri
    const contentHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')
    const stringToSign = [method, contentHash, '', url].join('\n')
    const signStr = this.config.accessKey + this.token + t + stringToSign
    return {
      t,
      path: url,
      client_id: this.config.accessKey,
      sign: await this.encryptStr(signStr),
      sign_method: 'HMAC-SHA256',
      access_token: this.token
    }
  }

  async query(method, url, body) {
    if (!this.token) this.token = await this.getToken()
    const reqHeaders = await this.getRequestSign(url, method, {}, body)
    const { data } = await this.httpClient.request({
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

  switchOnOff(deviceId, enable, idx) {
    const code = idx ? `switch_${idx}` : 'switch'
    return this.query('POST', `/v1.0/devices/${deviceId}/commands`, {
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
  switchOn(deviceId, idx) {
    return this.switchOnOff(deviceId, true, idx)
  }

  /**
   * Switch off the plug
   * @param {string} deviceId the device ID
   * @param {number?} idx the number of the switch, of not set the status of `switch` will be searched, which if for single plugs
   * @returns {Promise}
   */
  switchOff(deviceId, idx) {
    return this.switchOnOff(deviceId, false, idx)
  }

  /**
   * @param {string} deviceId
   * @returns {Promise}
   */
  getDeviceInfo(deviceId) {
    return this.query('GET', `/v1.0/devices/${deviceId}`)
  }

  /**
   * @param {string} deviceId
   * @returns {Promise}
   */
  getDeviceSpecs(deviceId) {
    return this.query('GET', `/v1.0/iot-03/devices/${deviceId}/specification`)
  }

  /**
   * @param {string} deviceId
   * @returns {Promise}
   */
  async getDeviceStatus(deviceId) {
    return this.query('GET', `/v1.0/devices/${deviceId}/status`)
  }

  /**
   * @param {string} deviceId
   * @param {number?} idx the number of the switch, of not set the status of `switch` will be searched, which if for single plugs
   * @returns {Promise.<boolean>}
   */
  async getDeviceStatusSwitch(deviceId, idx) {
    const code = idx ? `switch_${idx}` : 'switch'
    const res = await this.query('GET', `/v1.0/devices/${deviceId}/status`)
    return (res.result.find(e => e.code === code) || {}).value
  }

  /**
   * @param {string} deviceId
   * @param {string} code
   * @returns {Promise.<boolean>}
   */
  async getDeviceStatusCode(deviceId, code) {
    console.log('code', code)
    const res = await this.query('GET', `/v1.0/devices/${deviceId}/status`)
    return (res.result.find(e => e.code === code) || {}).value
  }

  /**
   * @param {string} deviceId
   * @param {string} command
   * @param {string} value
   * @returns {Promise.<boolean>}
   */
  async sendCommand(deviceId, command, value) {
    try {
      return await this.query('POST', `/v1.0/devices/${deviceId}/commands`, {
        commands: [{
          code: command,
          value: value
        }]
      })
    } catch (error) {
      console.error(error)
      return { error: error.message }
    }
  }

  /**
   * @param {string} deviceId
   * @param {number?} idx the number of the switch, of not set the status of `switch` will be searched, which if for single plugs
   * @returns {Promise.<{
   *   current: number,
   *   power: number,
   *   voltage: number
   * }>}
   */
  async getDevicePowerUsage(deviceId, idx) {
    const res = await this.query('GET', `/v1.0/devices/${deviceId}/status`)
    const { success, result = [] } = res
    if (!success) return { error: 'called failed' }
    return {
      current: (result.find(e => e.code === 'cur_current') || {}).value,
      power: (result.find(e => e.code === 'cur_power') || {}).value,
      voltage: (result.find(e => e.code === 'cur_voltage') || {}).value
    }
  }
}
