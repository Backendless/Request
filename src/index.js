import Cache from './cache'
import EventEmitter from './event-emitter'
import * as qs from './qs'
import { castArray, isObject, isFormData, isStream } from './utils'

const CONTENT_TYPE_HEADER = 'Content-Type'
const CACHE_FLUSH_INTERVAL = 60000 //60 sec

const cache = new Cache(CACHE_FLUSH_INTERVAL)

class ResponseError extends Error {
  constructor(response) {
    super()

    const error = parseError(response)

    this.message = error.message || error
    this.code = error.code

    this.status = response.status
    this.headers = response.headers
    this.body = response.body
  }
}

function parseError(res) {
  if (res.status === 502) {
    return 'No connection with server'
  }

  return res.body || `Status Code ${res.status} (${res.statusText})`
}

function parseBody(res) {
  try {
    return { ...res, body: JSON.parse(res.body) }
  } catch (e) {
    return res
  }
}

function parseHeaders(headersString) {
  const parsed = {}

  if (!headersString) {
    return parsed
  }

  headersString.split('\n').forEach(line => {
    const i = line.indexOf(':')
    const key = line.substr(0, i).trim()
    const val = line.substr(i + 1).trim()

    if (key) {
      parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val
    }
  })

  return parsed
}

const sendXmlHttpRequest = (path, method, headers, body, encoding, timeout) => {
  return new Promise(function sendRequest(resolve, reject) {
    let request = new Request.XMLHttpRequest()

    request.timeout = timeout

    if (!encoding) {
      request.responseType = 'arraybuffer'
    }

    request.open(method.toUpperCase(), path, true)

    request.onload = function handleLoadEvent() {
      const headers = parseHeaders(request.getAllResponseHeaders())
      const { status, statusText } = request

      const result = { status, statusText, headers }

      if (encoding === 'utf8') {
        result.body = request.response || request.responseText
      } else if (request.response) {
        result.body = new Uint8Array(request.response)
      }

      resolve(result)

      request = null
    }

    request.onerror = function handleErrorEvent() {
      reject(new Error('Network Error'))

      request = null
    }

    request.ontimeout = function handleTimeout() {
      reject(new Error('Connection aborted due to timeout'))

      request = null
    }

    Object.keys(headers).forEach(key => {
      request.setRequestHeader(key, headers[key])
    })

    request.send(body)
  })
}

const sendNodeAPIRequest = (path, method, headers, body, encoding, timeout) => {
  return new Promise((resolve, reject) => {
    const u = require('url').parse(path)
    const form = isFormData(body) && body

    const https = u.protocol === 'https:'
    const options = {
      host: u.hostname,
      port: u.port || (https ? 443 : 80),
      path: u.path,
      method,
      headers,
      timeout,
    }

    const _send = () => {
      const Buffer = require('buffer').Buffer
      const httpClient = require(https ? 'https' : 'http')

      const req = httpClient.request(options, res => {
        const strings = []
        const buffers = []
        let bufferLength = 0
        let body = ''

        const { statusCode: status, statusMessage: statusText, headers } = res

        res.on('data', chunk => {
          if (!Buffer.isBuffer(chunk)) {
            strings.push(chunk)

          } else if (chunk.length) {
            bufferLength += chunk.length
            buffers.push(chunk)
          }
        })

        res.on('end', () => {
          if (bufferLength) {
            body = Buffer.concat(buffers, bufferLength)

            if (encoding != null) {
              body = body.toString(encoding)
            }

          } else if (strings.length) {
            body = strings.join()
          }

          resolve({ status, statusText, headers, body })
        })

        res.on('error', reject)
      })

      req.on('error', reject)

      req.on('timeout', () => {
        req.destroy(new Error('Connection aborted due to timeout'))
      })

      if (body) {
        if (isStream(body)) {
          body.pipe(req)
          return
        }

        req.write(body)
      }

      req.end()
    }

    if (form) {
      Object.assign(options.headers, form.getHeaders())

      form.getLength(function(err, length) {
        if (!err && !isNaN(length)) {
          options.headers['content-length'] = length
        }

        _send()
      })
    } else {
      if (body && !options.headers['content-length']) {
        const Buffer = require('buffer').Buffer
        options.headers['content-length'] = Buffer.byteLength(body)
      }

      _send()
    }
  })
}

/**
 * Checks if a network request came back fine, and throws an error if not
 *
 * @param  {object} response   A response from a network request
 *
 * @return {object|undefined} Returns either the response, or throws an error
 */
function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response
  }

  throw new ResponseError(response)
}

const REQUEST_EVENT = 'request'
const RESPONSE_EVENT = 'response'
const ERROR_EVENT = 'error'
const DONE_EVENT = 'done'

class Request extends EventEmitter {

  constructor(path, method, body) {
    super()

    this.method = method
    this.path = path
    this.body = body
    this.tags = undefined
    this.unwrap = true
    this.cacheTTL = 0
    this.headers = {}
    this.queryParams = {}
    this.encoding = 'utf8'
    this.timeout = 0
  }

  /**
   * Sets a header
   *
   * @param {String|Object} key or map of headers
   * @param {String} [value]
   * @returns {Request}
   */
  set(key, value) {
    if (isObject(key)) {
      for (const headerName in key) {
        this.set(headerName, key[headerName])
      }
    } else if (typeof value !== 'undefined') {
      this.headers[key] = value
    }

    return this
  }

  /**
   * Which kind of tags this request affects.
   * Used for cache validation.
   * Non GET requests with defined tags, will clean all related to these tags caches
   *
   * @param {Array.<String>} tags
   * @returns {Request}
   */
  cacheTags(...tags) {
    this.tags = tags

    return this
  }

  /**
   * @param {Object} queryParams
   * @returns {Request}
   */
  query(queryParams) {
    Object.assign(this.queryParams, queryParams)

    return this
  }

  form(form) {
    if (form) {
      const FormData = module.exports.FormData

      if (form instanceof FormData) {
        this.body = form
      } else {
        const formData = new FormData()

        for (const formKey in form) {
          if (formKey) {
            castArray(form[formKey]).forEach(formValue => {
              if (formValue && formValue.hasOwnProperty('value') && formValue.hasOwnProperty('options')) {
                formData.append(formKey, formValue.value, formValue.options)
              } else {
                formData.append(formKey, formValue)
              }
            })
          }
        }

        this.body = formData
      }
    }

    return this
  }

  /**
   * Should we cache or use cached result
   *
   * @param {Number} ttl Time to live for cached response. 15 seconds by default
   * @returns {Request}
   */
  useCache(ttl = 15000) {
    this.cacheTTL = ttl

    return this
  }

  /**
   * Reset cache if passed TRUE and tags has been specified before
   *
   * @param {Boolean} reset - flag to reset cache or not
   * @returns {Request}
   */
  resetCache(reset) {
    if (reset && this.tags) {
      cache.deleteByTags(this.tags)
    }

    return this
  }

  /**
   * Shortcut for req.set('Content-Type', value)
   *
   * @param {String} contentType
   * @returns {Request}
   */
  type(contentType) {
    this.set(CONTENT_TYPE_HEADER, contentType)

    return this
  }

  /**
   * Should we unwrap the response and return only body. true by default
   * @param {Boolean} unwrap
   * @returns {Request}
   */
  unwrapBody(unwrap) {
    this.unwrap = unwrap

    return this
  }

  /**
   * set encoding to response
   * works only for Node js
   *
   * @param {String} encoding
   * @returns {Request}
   */
  setEncoding(encoding) {
    this.encoding = encoding

    return this
  }

  /**
   * A number specifying request timeout in milliseconds.
   * @param {Number} ms
   * @returns {Request}
   */
  setTimeout(ms) {
    this.timeout = ms

    return this
  }

  /**
   * Sends the requst
   *
   * @param {Object} body
   * @returns {Promise}
   */
  send(body) {
    this.emit(REQUEST_EVENT, this)

    let path = this.path
    const queryString = qs.stringify(this.queryParams)

    if (queryString) {
      path += '?' + queryString
    }

    if (this.cacheTTL) {
      const cached = cache.get(path)

      if (cached !== undefined) {
        return Promise.resolve(cached)
      }
    }

    const type = this.headers[CONTENT_TYPE_HEADER]

    if (!type && isObject(body) && !isFormData(body)) {
      this.type('application/json')
    }

    if (body) {
      const isJSON = this.headers[CONTENT_TYPE_HEADER] === 'application/json'

      body = (isJSON && typeof body !== 'string') ? JSON.stringify(body) : body
    }

    const unwrapBody = res => {
      return this.unwrap ? res.body : res
    }

    /**
     * Caches the response if required
     */
    const cacheResponse = res => {
      if (this.cacheTTL) {
        cache.set(path, res, this.tags, this.cacheTTL)
      }

      return res
    }

    /**
     * Deletes all relevant to req.cacheTags keys from the cache if this request method is not GET
     */
    const flushCache = res => {
      if (this.tags && this.method !== 'get') {
        cache.deleteByTags(this.tags)
      }

      return res
    }

    if (Request.verbose) {
      console.log(this.method.toUpperCase(), decodeURIComponent(path), body, this.headers)
    }

    const request = Request.send(path, this.method.toUpperCase(), this.headers, body, this.encoding, this.timeout)
      .then(parseBody)
      .then(checkStatus)
      .then(unwrapBody)
      .then(cacheResponse)
      .then(flushCache)

    request
      .then(result => {
        this.emit(RESPONSE_EVENT, result)
        this.emit(DONE_EVENT, null, result)
      })
      .catch(error => {
        this.emit(ERROR_EVENT, error)
        this.emit(DONE_EVENT, error)
      })

    return request
  }

  /**
   * If you are too lazy to use method 'send', don't use it and stay cool :)
   *
   * @param {Function} successHandler
   * @param {Function} errorHandler
   * @returns {Promise}
   */
  then(successHandler, errorHandler) {
    this.promise = this.promise || this.send(this.body)

    return this.promise.then(successHandler, errorHandler)
  }

  /**
   * @param {Function} errorHandler
   * @returns {Promise}
   */
  catch(errorHandler) {
    this.promise = this.promise || this.send(this.body)

    return this.promise.catch(errorHandler)
  }
}

Object.defineProperty(Request, 'FormData', {
  get() {
    return typeof FormData !== 'undefined' ? FormData : require('form-data')
  }
})

Request.XMLHttpRequest = typeof XMLHttpRequest !== 'undefined' ? XMLHttpRequest : undefined

Request.send = (path, method, headers, body, encoding, timeout) => {
  const sender = typeof Request.XMLHttpRequest !== 'undefined'
    ? sendXmlHttpRequest
    : sendNodeAPIRequest

  return sender(path, method, headers, body, encoding, timeout)
}

Request.verbose = false
Request.methods = ['get', 'post', 'put', 'patch', 'delete']

Request.methods.forEach(method => {
  Request[method] = function(path, body) {
    return new Request(path, method, body)
  }
})

module.exports = Request
