import http from 'http'
import https from 'https'
import FormData from 'form-data'

import { EventEmitter } from './event-emitter'

class HTTPRequest extends EventEmitter {
  constructor(transaction) {
    super()

    this.transaction = transaction
  }

  end() {
    this.emit('run:end')
  }

  destroy(reason) {
    if (typeof reason === 'string') {
      reason = new Error(reason)
    }

    this.emit('error', reason)
  }

  write(body) {
    this.transaction.requestBody = body
  }

  emit(eventName, ...args) {
    if (eventName === 'pipe') {
      if (args[0] instanceof FormData) {
        this.transaction.requestForm = args[0]
      }
    }

    super.emit(eventName, ...args)
  }

  removeListener(event) {
    this.off(event)
  }
}

class HTTPResponse extends EventEmitter {
  constructor(transaction, { statusCode, statusMessage, headers, failByTimeoutError, clientError } = {}) {
    super()

    this.transaction = transaction

    this.statusCode = statusCode || 200
    this.statusMessage = statusMessage || 'OK'
    this.headers = headers || {}
    this.failByTimeoutError = failByTimeoutError
    this.clientError = clientError
  }

}

export function registerNodeTransaction(chunks, response) {
  const transaction = {}

  if (typeof chunks === 'string') {
    chunks = [chunks]
  }

  const req = new HTTPRequest(transaction)
  const res = new HTTPResponse(transaction, response)

  const mockCallback = (options, callback) => {
    transaction.options = options

    req.on('run:end', () => {
      setImmediate(() => {
        callback(res)
      })

      setImmediate(() => {
        if (res.clientError) {
          res.emit('error', res.clientError)
        } else if (res.failByTimeoutError) {
          req.emit('timeout')
        } else {
          if (chunks) {
            chunks.forEach(chunk => {
              res.emit('data', chunk)
            })
          }

          res.emit('end')
        }
      })
    })

    return req
  }

  jest.spyOn(http, 'request').mockImplementationOnce(mockCallback)
  jest.spyOn(https, 'request').mockImplementationOnce(mockCallback)

  return transaction
}
