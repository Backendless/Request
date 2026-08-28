import { cache } from './cache'
import EventEmitter from './event-emitter'
import * as qs from './qs'
import { castArray, isObject, isFormData, ensureEncoding } from './utils'
import { ResponseError } from './error'

const CONTENT_TYPE_HEADER = 'Content-Type'

// methods which can not change anything on the server, a request made with one of them must not
// invalidate the cached responses
const SAFE_METHODS = ['get', 'head', 'options']

// the only TLS options a caller may pass, everything else (rejectUnauthorized and friends) is
// dropped on purpose so that a config blob can not weaken the connection by accident
const TLS_OPTION_KEYS = ['cert', 'key', 'passphrase', 'ca']

const REQUEST_EVENT = 'request'
const RESPONSE_EVENT = 'response'
const ERROR_EVENT = 'error'
const DONE_EVENT = 'done'

export class Request extends EventEmitter {

  constructor(path, method, body) {
    super()

    this.method = method
    this.path = ensureEncoding(path)
    this.body = body
    this.tags = undefined
    this.unwrap = true
    this.cacheTTL = 0
    this.headers = {}
    this.queryParams = {}
    this.encoding = 'utf8'
    this.timeout = 0
    this.withCredentials = null

    // the private key is credential material, a non enumerable property keeps it out of
    // console.log(request)/JSON.stringify(request) in whatever logging a caller has around
    Object.defineProperty(this, 'tlsOptions', {
      value       : undefined,
      writable    : true,
      enumerable  : false,
      configurable: true,
    })
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
   * Shortcut for req.set('Authorization', `Basic ${basicAuth.token}`)
   *
   * @param {Object} [basicAuth]
   * @param {String} basicAuth.token
   * @returns {Request}
   */
  basicAuth(basicAuth) {
    if (basicAuth) {
      this.set({ Authorization: `Basic ${basicAuth.token}` })
    }

    return this
  }

  /**
   * Shortcut for req.set('auth-key', authKey)
   *
   * @param {String} [authKey]
   * @returns {Request}
   */
  authKey(authKey) {
    if (authKey) {
      this.set({ 'auth-key': authKey })
    }

    return this
  }

  /**
   * Attaches a TLS client certificate and private key to the request (mutual TLS).
   *
   * Works only for Node js, in a browser the client certificate is chosen by the browser itself.
   *
   * Calling the method several times merges the options, so the certificate and the key may come
   * from different places. Options other than the ones listed below are ignored.
   *
   * @param {Object} [tlsOptions]
   * @param {String|Buffer|Array} tlsOptions.cert PEM encoded client certificate (or chain)
   * @param {String|Buffer|Array} tlsOptions.key PEM encoded private key
   * @param {String} [tlsOptions.passphrase] passphrase of an encrypted private key
   * @param {String|Buffer|Array} [tlsOptions.ca] PEM encoded CA bundle to verify the server with
   * @returns {Request}
   */
  cert(tlsOptions) {
    const options = tlsOptions && pickTLSOptions(tlsOptions)

    if (options && Object.keys(options).length) {
      this.tlsOptions = { ...this.tlsOptions, ...options }
    }

    return this
  }

  /**
   * Which kind of tags this request affects.
   * Used for cache validation.
   * Requests with defined tags made with a method which changes the server state,
   * will clean all related to these tags caches
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
      const FormData = Request.FormData

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
   * set withCredentials option
   *
   * @param {Boolean} value
   * @returns {Request}
   */
  setWithCredentials(value) {
    this.withCredentials = value

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
   * Sends the request
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
     * Deletes all relevant to req.cacheTags keys from the cache if this request method is not a safe one
     */
    const flushCache = res => {
      if (this.tags && !SAFE_METHODS.includes(this.method)) {
        cache.deleteByTags(this.tags)
      }

      return res
    }

    if (Request.verbose) {
      console.log(this.method.toUpperCase(), decodeURIComponent(path), body, this.headers)
    }

    const withCredentials = typeof this.withCredentials === 'boolean'
      ? this.withCredentials
      : Request.withCredentials

    const syncError = new Error()

    const request = Request.send(
      path,
      this.method.toUpperCase(),
      this.headers,
      body,
      this.encoding,
      this.timeout,
      withCredentials,
      this.tlsOptions
    )
      .then(parseBody)
      .then(checkStatus)
      .then(unwrapBody)
      .then(cacheResponse)
      .then(flushCache)
      .catch(error => {
        error.stack = `${error.stack}${syncError.stack}`

        throw error
      })

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

/**
 * Keeps only the known TLS options and skips the empty ones,
 * `undefined` values would otherwise overwrite already collected options on a merge
 */
function pickTLSOptions(tlsOptions) {
  const result = {}

  TLS_OPTION_KEYS.forEach(key => {
    if (tlsOptions[key] !== undefined && tlsOptions[key] !== null) {
      result[key] = tlsOptions[key]
    }
  })

  return result
}

function parseBody(res) {
  try {
    return { ...res, body: JSON.parse(res.body) }
  } catch (e) {
    return res
  }
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

