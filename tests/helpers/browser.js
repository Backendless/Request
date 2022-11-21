import Request from '../../src'

const mockXMLHttpRequestGetter = jest.fn()

Object.defineProperty(Request, 'XMLHttpRequest', {
  get() {
    return mockXMLHttpRequestGetter()
  }
})

export function registerBrowserTransaction(data, response) {
  const { statusCode, statusMessage, headersString, failByTimeoutError, clientError } = response || {}

  const transaction = {
    options: {
      headers: {}
    },
  }

  class MockXMLHttpRequest {
    constructor() {
      this.status = statusCode || 200
      this.statusText = statusMessage || 'OK'

      this.headersString = headersString || ''

      if (typeof data === 'string') {
        this.responseText = data
      } else {
        this.response = data
      }

      this.onload = null
      this.onerror = null
      this.ontimeout = null
    }

    set timeout(value) {
      transaction.options.timeout = value
    }

    set responseType(value) {
      transaction.options.responseType = value
    }

    open(method, path, async) {
      transaction.options.method = method
      transaction.options.path = path
      transaction.options.async = async
    }

    send(body) {
      transaction.requestBody = body

      setImmediate(() => {
        if (clientError) {
          this.onerror()
        } else if (failByTimeoutError) {
          this.ontimeout()
        } else {
          this.onload()
        }
      })
    }

    getAllResponseHeaders() {
      return this.headersString
    }

    setRequestHeader(key, value) {
      transaction.options.headers[key] = value
    }
  }

  // need to use 2 mock because it uses as a getter and the Request reads the property twice
  mockXMLHttpRequestGetter
    .mockImplementationOnce(() => MockXMLHttpRequest)
    .mockImplementationOnce(() => MockXMLHttpRequest)

  return transaction
}
