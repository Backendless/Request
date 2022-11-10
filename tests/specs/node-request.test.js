import http from 'http'
import https from 'https'
import { Buffer } from 'buffer'
import FormData from 'form-data'

// import EventsEmitter from 'event-emitter'

import Request from '../../src'

// const Request = require('../../src')
class EventEmitter {
  constructor() {
    this.events = {}
  }

  on(eventName, callback) {
    this.events[eventName] = this.events[eventName] || []
    this.events[eventName].push(callback)

    return this
  }

  off(eventName, callback) {
    if (!eventName) {
      this.events = {}

    } else if (this.events[eventName]) {
      if (callback) {
        this.events[eventName] = this.events[eventName].filter(c => c !== callback)
      } else {
        delete this.events[eventName]
      }
    }

    return this
  }

  emit(eventName, ...args) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(callback => callback(...args))
    }
  }

}

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
  constructor(transaction, { statusCode, statusMessage, headers, failByTimeout } = {}) {
    super()

    this.transaction = transaction

    this.statusCode = statusCode || 200
    this.statusMessage = statusMessage || 'OK'
    this.headers = headers || {}
    this.failByTimeout = failByTimeout
  }

}

function registerTransaction(chunks, response) {
  const transaction = {}

  if (typeof chunks === 'string') {
    chunks = [chunks]
  }

  const req = new HTTPRequest(transaction)

  const res = new HTTPResponse(transaction, response)

  transaction.req = req
  transaction.res = res

  const mockCallback = (options, callback) => {
    transaction.options = options

    req.on('run:end', () => {
      setImmediate(() => {
        callback(res)
      })

      setImmediate(() => {
        if (res.failByTimeout) {
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

const wait = time => new Promise(r => setTimeout(r, time))

describe('Node Client', () => {

  afterEach(() => {
    Request.resetAllCache()
  })

  describe('Request Options', () => {
    it('runs a basic request', async () => {
      const transaction = registerTransaction(JSON.stringify({ foo: 123 }))

      const result = await Request.get('http://foo.bar:9898/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'headers': {},
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })
    })

    it('runs an request without protocol', async () => {
      const transaction = registerTransaction(JSON.stringify({ foo: 123 }))

      const result = await Request.get('foo.bar/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'headers': {},
        'host'   : null,
        'method' : 'GET',
        'path'   : 'foo.bar/path/to/api',
        'port'   : 80,
        'timeout': 0
      })
    })

    it('runs an http request without port', async () => {
      const transaction = registerTransaction(JSON.stringify({ foo: 123 }))

      const result = await Request.get('http://foo.bar/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'headers': {},
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api',
        'port'   : 80,
        'timeout': 0
      })
    })

    it('runs an https request without port', async () => {
      const transaction = registerTransaction(JSON.stringify({ foo: 123 }))

      const result = await Request.get('https://foo.bar/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'headers': {},
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api',
        'port'   : 443,
        'timeout': 0
      })
    })

    it('runs a request with a specific status', async () => {
      const transaction = registerTransaction(JSON.stringify({ foo: 123 }), {
        statusCode   : 202,
        statusMessage: 'Spec Status'
      })

      const result = await Request.get('http://foo.bar:9898/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'headers': {},
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })
    })

    it('returns a response with invalid JSON', async () => {
      const transaction = registerTransaction('invalid json')

      const result = await Request.get('http://foo.bar:9898/path/to/api')

      expect(result).toEqual('invalid json')


      expect(transaction.options).toEqual({
        'headers': {},
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })
    })

    it('fails by timeout', async () => {
      registerTransaction(null, {
        failByTimeout: true
      })

      let error = null

      try {
        await Request.get('http://foo.bar:9898/path/to/api')
      } catch (e) {
        error = e
      }

      expect(error).toBeInstanceOf(Error)

      expect(error.message).toEqual('Connection aborted due to timeout')
    })
  })

  describe('Request URL', () => {
    it('has encoded URI components', async () => {
      const transaction1 = registerTransaction(null)
      const transaction2 = registerTransaction(null)
      const transaction3 = registerTransaction(null)
      const transaction4 = registerTransaction(null)

      await Request.get(`http://foo.bar/path/${encodeURIComponent('@')}/${encodeURIComponent(' ')}`)
      await Request.get(`http://foo.bar/path/%40/${encodeURIComponent(' ')}`)
      await Request.get(`http://foo.bar/path/${encodeURIComponent('@')}/%20`)
      await Request.get('http://foo.bar/path/%40/%20')

      expect(transaction1.options.path).toEqual('/path/%40/%20')
      expect(transaction2.options.path).toEqual('/path/%40/%20')
      expect(transaction3.options.path).toEqual('/path/%40/%20')
      expect(transaction4.options.path).toEqual('/path/%40/%20')
    })

    it('has specific URI components', async () => {
      const transaction1 = registerTransaction(null)
      const transaction2 = registerTransaction(null)

      await Request.get('http://foo.bar/path/@/ /абв/')
      await Request.get('http://foo.bar/path/%40/%20/%D0%B0%D0%B1%D0%B2/')

      expect(transaction1.options.path).toEqual('/path/%40/%20/%D0%B0%D0%B1%D0%B2/')
      expect(transaction2.options.path).toEqual('/path/%40/%20/%D0%B0%D0%B1%D0%B2/')
    })
  })

  describe('Request Query', () => {
    it('runs a request with primitive query', async () => {
      const transaction = registerTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .query({
          str  : 'str',
          num1 : 0,
          num2 : 123,
          bool1: true,
          bool2: false,
        })

      expect(transaction.options).toEqual({
        'headers': {},
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api?str=str&num1=0&num2=123&bool1=true&bool2=false',
        'port'   : '9898',
        'timeout': 0
      })
    })

    it('runs a request with array in query', async () => {
      const transaction = registerTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .query({
          numArr: [1, 2, 3],
          strArr: ['a', 'b', 'c'],
        })

      expect(transaction.options).toEqual({
        'headers': {},
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api?numArr=1&numArr=2&numArr=3&strArr=a&strArr=b&strArr=c',
        'port'   : '9898',
        'timeout': 0
      })
    })

    it('runs a request with spec characters in query', async () => {
      const transaction = registerTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .query({
          str    : 'абв',
          space  : ' ',
          percent: '%',
          at     : '@',
          strArr : ['абв', ' ', '%', '@'],
        })

      expect(transaction.options).toEqual({
        'headers': {},
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api?str=%D0%B0%D0%B1%D0%B2&space=%20&percent=%25&at=%40&strArr=%D0%B0%D0%B1%D0%B2&strArr=%20&strArr=%25&strArr=%40',
        'port'   : '9898',
        'timeout': 0
      })
    })
  })

  describe('Request Headers', () => {
    it('runs a request with headers', async () => {
      const transaction = registerTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .set({
          header1: 'value1',
          header2: 'value3',
          header3: 'value3',
        })
        .set('header4', 'value4')

      expect(transaction.options).toEqual({
        'headers': {
          'header1': 'value1',
          'header2': 'value3',
          'header3': 'value3',
          'header4': 'value4'
        },
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })
    })
  })

  describe('Request Content Type', () => {
    it('runs a request with headers', async () => {
      const transaction = registerTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .type('application/pdf')

      expect(transaction.options).toEqual({
        'headers': {
          'Content-Type': 'application/pdf',
        },
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })
    })

    it('runs a request with application/json', async () => {
      const transaction1 = registerTransaction()
      const transaction2 = registerTransaction()

      await Request.post('http://foo.bar:9898/path/to/api', { prop: 'test' })
      await Request.post('http://foo.bar:9898/path/to/api', [1, 2, 3])

      expect(transaction1.requestBody).toEqual('{"prop":"test"}')
      expect(transaction1.options).toEqual({
        'headers': {
          'Content-Type'  : 'application/json',
          'content-length': 15
        },
        'host'   : 'foo.bar',
        'method' : 'POST',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })

      expect(transaction2.requestBody).toEqual('[1,2,3]')
      expect(transaction2.options).toEqual({
        'headers': {
          'Content-Type'  : 'application/json',
          'content-length': 7
        },
        'host'   : 'foo.bar',
        'method' : 'POST',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })
    })

    it('does not stringify a body', async () => {
      const transaction = registerTransaction()

      await Request.post('http://foo.bar:9898/path/to/api', JSON.stringify({ prop: 'test' }))
        .type('application/json')

      expect(transaction.requestBody).toEqual('{"prop":"test"}')
      expect(transaction.options).toEqual({
        'headers': {
          'Content-Type'  : 'application/json',
          'content-length': 15
        },
        'host'   : 'foo.bar',
        'method' : 'POST',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })

    })
  })

  describe('Request Form', () => {
    it('gets FormData from the global scope', async () => {
      global.FormData = 123

      expect(Request.FormData).toBe(123)

      delete global.FormData
    })

    it('gets FormData from the node_modules', async () => {
      expect(Request.FormData).toBe(FormData)
    })

    it('adds primitive form properties', async () => {
      const transaction = registerTransaction()

      await Request.post('http://foo.bar:9898/path/to/api')
        .form({
          str  : 'str',
          num1 : 0,
          num2 : 123,
          bool1: true,
          bool2: false,
        })

      expect(transaction.requestForm).toBeInstanceOf(FormData)

      expect(transaction.options).toEqual({
        'headers': {
          'content-length': 579,
          'content-type'  : `multipart/form-data; boundary=${transaction.requestForm._boundary}`
        },
        'host'   : 'foo.bar',
        'method' : 'POST',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })
    })

    it('adds array form properties', async () => {
      const transaction = registerTransaction()

      await Request.post('http://foo.bar:9898/path/to/api')
        .form({
          arr1: [1, 2, 3],
          arr2: ['a', 'b', 'c'],
        })

      expect(transaction.requestForm).toBeInstanceOf(FormData)

      expect(transaction.options).toEqual({
        'headers': {
          'content-length': 680,
          'content-type'  : `multipart/form-data; boundary=${transaction.requestForm._boundary}`
        },
        'host'   : 'foo.bar',
        'method' : 'POST',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })
    })

    it('receives a form instance', async () => {
      const transaction = registerTransaction()

      const form = new FormData()

      form.append('foo', 'bar')
      form.append('num', 123)
      form.append('arr1', 1)
      form.append('arr2', 2)
      form.append('arr3', 3)

      await Request.post('http://foo.bar:9898/path/to/api')
        .form(form)

      expect(transaction.requestForm).toBeInstanceOf(FormData)

      expect(transaction.options).toEqual({
        'headers': {
          'content-length': 578,
          'content-type'  : `multipart/form-data; boundary=${transaction.requestForm._boundary}`
        },
        'host'   : 'foo.bar',
        'method' : 'POST',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })
    })
  })

  describe('Request Timeout', () => {
    it('runs a request with timeout', async () => {
      const transaction = registerTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .setTimeout(1200)

      expect(transaction.options).toEqual({
        'headers': {},
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 1200
      })
    })
  })

  describe('Request Methods', () => {
    it('runs a GET request', async () => {
      const transaction = registerTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')

      expect(transaction.options).toEqual({
        'headers': {},
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })
    })

    it('runs a POST request', async () => {
      const transaction = registerTransaction()

      await Request.post('http://foo.bar:9898/path/to/api', { prop: 123 })

      expect(transaction.requestBody).toEqual('{"prop":123}')
      expect(transaction.options).toEqual({
        'headers': {
          'Content-Type'  : 'application/json',
          'content-length': 12
        },
        'host'   : 'foo.bar',
        'method' : 'POST',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })
    })

    it('runs a PUT request', async () => {
      const transaction = registerTransaction()

      await Request.put('http://foo.bar:9898/path/to/api', { prop: 123 })

      expect(transaction.requestBody).toEqual('{"prop":123}')
      expect(transaction.options).toEqual({
        'headers': {
          'Content-Type'  : 'application/json',
          'content-length': 12
        },
        'host'   : 'foo.bar',
        'method' : 'PUT',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })
    })

    it('runs a DELETE request', async () => {
      const transaction = registerTransaction()

      await Request.delete('http://foo.bar:9898/path/to/api', { prop: 123 })

      expect(transaction.requestBody).toEqual('{"prop":123}')
      expect(transaction.options).toEqual({
        'headers': {
          'Content-Type'  : 'application/json',
          'content-length': 12
        },
        'host'   : 'foo.bar',
        'method' : 'DELETE',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })
    })
  })

  describe('Response Error', () => {
    it('fails with body', async () => {
      registerTransaction(JSON.stringify({
        message: 'Error from the server',
        code   : 1234,
      }), {
        statusCode   : 400,
        statusMessage: 'Bad Request',
      })

      let error = null

      try {
        await Request.get('http://foo.bar:9898/path/to/api')
      } catch (e) {
        error = e
      }

      expect(error).toBeInstanceOf(Error)

      expect({ ...error }).toEqual({
        'body'   : {
          'code'   : 1234,
          'message': 'Error from the server'
        },
        'code'   : 1234,
        'headers': {},
        'message': 'Error from the server',
        'status' : 400
      })
    })

    it('fails without body', async () => {
      registerTransaction(null, {
        statusCode   : 400,
        statusMessage: 'Bad Request',
      })

      let error = null

      try {
        await Request.get('http://foo.bar:9898/path/to/api')
      } catch (e) {
        error = e
      }

      expect(error).toBeInstanceOf(Error)

      expect({ ...error }).toEqual({
        'body'   : '',
        'headers': {},
        'message': 'Status Code 400 (Bad Request)',
        'status' : 400
      })
    })

    it('fails with 502', async () => {
      registerTransaction(null, {
        statusCode   : 502,
        statusMessage: 'Bad Gateway',
      })

      let error = null

      try {
        await Request.get('http://foo.bar:9898/path/to/api')
      } catch (e) {
        error = e
      }

      expect(error).toBeInstanceOf(Error)

      expect({ ...error }).toEqual({
        'body'   : '',
        'headers': {},
        'message': 'No connection with server',
        'status' : 502
      })
    })

    it('catch an error', async () => {
      registerTransaction(null, {
        statusCode   : 502,
        statusMessage: 'Bad Gateway',
      })

      let error = null

      await Request.get('http://foo.bar:9898/path/to/api')
        .catch(e => error = e)

      expect(error).toBeInstanceOf(Error)

      expect({ ...error }).toEqual({
        'body'   : '',
        'headers': {},
        'message': 'No connection with server',
        'status' : 502
      })
    })
  })

  describe('Response Body', () => {
    it('receives a couple of buffers', async () => {
      const buffer = Buffer.from(JSON.stringify({ foo: 123, str: 'hello' }))

      const transaction = registerTransaction([
        buffer.slice(0, buffer.length / 2),
        buffer.slice(buffer.length / 2, buffer.length),
      ])

      const result = await Request.get('http://foo.bar:9898/path/to/api')

      expect(result).toEqual({ foo: 123, str: 'hello' })

      expect(transaction.options).toEqual({
        'headers': {},
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })

    })

    it('returns a buffer', async () => {
      const buffer = Buffer.from('hello world')

      const transaction = registerTransaction([
        buffer.slice(0, buffer.length / 2),
        buffer.slice(buffer.length / 2, buffer.length),
      ])

      const result = await Request.get('http://foo.bar:9898/path/to/api')
        .setEncoding(null)

      expect(result).toBeInstanceOf(Buffer)
      expect(result.toString('utf8')).toEqual('hello world')

      expect(transaction.options).toEqual({
        'headers': {},
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })

    })

    it('returns the entire response', async () => {
      const transaction = registerTransaction([
        JSON.stringify({ foo: 123, str: 'hello' }),
      ])

      const result = await Request.get('http://foo.bar:9898/path/to/api')
        .unwrapBody(false)

      expect(result).toEqual({
        'body'      : {
          'foo': 123,
          'str': 'hello'
        },
        'headers'   : {},
        'status'    : 200,
        'statusText': 'OK'
      })

      expect(transaction.options).toEqual({
        'headers': {},
        'host'   : 'foo.bar',
        'method' : 'GET',
        'path'   : '/path/to/api',
        'port'   : '9898',
        'timeout': 0
      })

    })
  })

  describe('Verbose', () => {
    afterEach(() => {
      Request.verbose = false
    })

    it('receives a couple of buffers', async () => {
      const log = jest.spyOn(console, 'log').mockImplementation()

      registerTransaction()
      registerTransaction()
      registerTransaction()
      registerTransaction()

      Request.verbose = true

      await Request.get('http://foo.bar:9898/path/to/api')
      await Request.post('http://foo.bar:9898/path/to/api', { num: 123 })
      await Request.put('http://foo.bar:9898/path/to/api', [1, 2, 3])
      await Request.delete('http://foo.bar:9898/path/to/api', 'str')

      expect(log.mock.calls).toHaveLength(4)

      expect(log.mock.calls[0]).toEqual([
        'GET',
        'http://foo.bar:9898/path/to/api',
        undefined,
        {}
      ])

      expect(log.mock.calls[1]).toEqual([
        'POST',
        'http://foo.bar:9898/path/to/api',
        '{"num":123}',
        {
          'Content-Type'  : 'application/json',
          'content-length': 11
        }
      ])

      expect(log.mock.calls[2]).toEqual([
        'PUT',
        'http://foo.bar:9898/path/to/api',
        '[1,2,3]',
        {
          'Content-Type'  : 'application/json',
          'content-length': 7
        }
      ])

      expect(log.mock.calls[3]).toEqual([
        'DELETE',
        'http://foo.bar:9898/path/to/api',
        'str',
        {
          'content-length': 3
        }
      ])
    })
  })

  describe('Cache', () => {
    it('uses data from cache', async () => {
      registerTransaction(['result1'])

      const result1 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1', 'tag2')
        .useCache()

      const result2 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1')
        .useCache()

      const result3 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag2')
        .useCache()

      expect(result1).toBe('result1')
      expect(result1).toBe(result2)
      expect(result1).toBe(result3)
    })

    it('uses RegExp in tags when creates a cache', async () => {
      registerTransaction(['result1'])
      registerTransaction()
      registerTransaction(['result2'])

      const result1 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags(/[tag1|tag2]/)
        .useCache()

      const result2 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1')
        .useCache()

      const result3 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag2')
        .useCache()

      await Request.post('http://foo.bar:9898/path/to/api')
        .cacheTags('tag2')

      const result4 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag2')
        .useCache()

      expect(result1).toBe('result1')
      expect(result1).toBe(result2)
      expect(result1).toBe(result3)

      expect(result4).toBe('result2')
    })

    it('uses RegExp in tags when finds a cache', async () => {
      registerTransaction(['result1'])
      registerTransaction()
      registerTransaction(['result2'])

      const result1 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1', 'tag2')
        .useCache()

      const result2 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags(/[tag1]/)
        .useCache()

      const result3 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags(/[tag2]/)
        .useCache()

      await Request.post('http://foo.bar:9898/path/to/api')
        .cacheTags(/[tag2]/)

      const result4 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1')
        .useCache()

      expect(result1).toBe('result1')
      expect(result1).toBe(result2)
      expect(result1).toBe(result3)

      expect(result4).toBe('result2')
    })

    it('resets cache by demand', async () => {
      registerTransaction(['result1'])
      registerTransaction(['result2'])

      const result1 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1', 'tag2')
        .useCache()

      const req2 = Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1')
        .useCache()

      const result2 = await req2

      req2.resetCache(true)

      const result3 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag2')
        .useCache()

      expect(result1).toBe('result1')
      expect(result1).toBe(result2)

      expect(result3).toBe('result2')
    })

    it('resets cache by ttl', async () => {
      registerTransaction(['result1'])
      registerTransaction(['result2'])

      const result1 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1', 'tag2')
        .useCache(300)

      await wait(350)

      const result2 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1')
        .useCache()

      expect(result1).toBe('result1')
      expect(result2).toBe('result2')
    })

    it('resets all caches by ttl', async () => {
      const oldFlushInterval = Request.__cache.flushInterval
      Request.__cache.setFlushInterval(500)

      registerTransaction(['result1'])
      registerTransaction(['result2'])

      const result1 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1', 'tag2')
        .useCache(300)

      await wait(2000)

      const result2 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1')
        .useCache()

      expect(result1).toBe('result1')
      expect(result2).toBe('result2')

      Request.__cache.setFlushInterval(oldFlushInterval)
    })

    it('resets cache by POST request', async () => {
      registerTransaction(['result1'])
      registerTransaction()
      registerTransaction(['result2'])

      const result1 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1', 'tag2')
        .useCache()

      await Request.post('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1')

      const result3 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag2')
        .useCache()

      expect(result1).toBe('result1')

      expect(result3).toBe('result2')
    })

    it('resets cache by PUT request', async () => {
      registerTransaction(['result1'])
      registerTransaction()
      registerTransaction(['result2'])

      const result1 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1', 'tag2')
        .useCache()

      await Request.post('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1')

      const result3 = await Request.put('http://foo.bar:9898/path/to/api')
        .cacheTags('tag2')
        .useCache()

      expect(result1).toBe('result1')

      expect(result3).toBe('result2')
    })

    it('resets cache by DELETE request', async () => {
      registerTransaction(['result1'])
      registerTransaction()
      registerTransaction(['result2'])

      const result1 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1', 'tag2')
        .useCache()

      await Request.delete('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1')

      const result3 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag2')
        .useCache()

      expect(result1).toBe('result1')

      expect(result3).toBe('result2')
    })
  })

  describe('Events', () => {

    const REQUEST_EVENT = 'request'
    const RESPONSE_EVENT = 'response'
    const ERROR_EVENT = 'error'
    const DONE_EVENT = 'done'

    let events
    let addListener

    beforeEach(() => {
      events = []
      addListener = name => (...args) => events.push([name, args])
    })

    it('listens REQUEST event', async () => {
      registerTransaction(['result1'])

      const req = Request.get('http://foo.bar:9898/path/to/api')
        .on(REQUEST_EVENT, addListener(REQUEST_EVENT))

      await req

      expect(events).toEqual([
        [REQUEST_EVENT, [req]]
      ])
    })

    it('listens RESPONSE event', async () => {
      registerTransaction(['result1'])

      const req = Request.get('http://foo.bar:9898/path/to/api')
        .on(RESPONSE_EVENT, addListener(RESPONSE_EVENT))

      await req

      expect(events).toEqual([
        [RESPONSE_EVENT, ['result1']]
      ])
    })

    it('listens ERROR event', async () => {
      registerTransaction(null, { failByTimeout: true })

      const req = Request.get('http://foo.bar:9898/path/to/api')
        .on(ERROR_EVENT, addListener(ERROR_EVENT))

      await req.catch(_ => _)

      expect(events).toEqual([
        [ERROR_EVENT, [new Error('Connection aborted due to timeout')]]
      ])
    })

    it('listens DONE event', async () => {
      registerTransaction(['result1'])
      registerTransaction(null, { failByTimeout: true })

      const req1 = Request.get('http://foo.bar:9898/path/to/api')
        .on(DONE_EVENT, addListener(DONE_EVENT))

      const req2 = Request.get('http://foo.bar:9898/path/to/api')
        .on(DONE_EVENT, addListener(DONE_EVENT))

      await req1
      await req2.catch(_ => _)

      expect(events).toEqual([
        [DONE_EVENT, [null, 'result1']],
        [DONE_EVENT, [new Error('Connection aborted due to timeout')]]
      ])
    })

    it('can unsubscribe a listener from event', async () => {
      registerTransaction(['result1'])

      const listener1 = jest.fn(addListener(DONE_EVENT))
      const listener2 = jest.fn(addListener(DONE_EVENT))

      const req1 = Request.get('http://foo.bar:9898/path/to/api')
        .on(DONE_EVENT, listener1)
        .on(DONE_EVENT, listener2)
        .off(DONE_EVENT, listener1)

      await req1

      expect(events).toEqual([
        [DONE_EVENT, [null, 'result1']],
      ])

      expect(listener1.mock.calls).toHaveLength(0)

      expect(listener2.mock.calls).toEqual([
        [null, 'result1'],
      ])
    })

    it('can unsubscribe all listeners from a specific event', async () => {
      registerTransaction(['result1'])

      const listener1 = jest.fn(addListener(DONE_EVENT))
      const listener2 = jest.fn(addListener(DONE_EVENT))

      const req1 = Request.get('http://foo.bar:9898/path/to/api')
        .on(DONE_EVENT, listener1)
        .on(DONE_EVENT, listener2)
        .off(DONE_EVENT)

      await req1

      expect(events).toEqual([])

      expect(listener1.mock.calls).toHaveLength(0)
      expect(listener2.mock.calls).toHaveLength(0)
    })

    it('can unsubscribe all listeners', async () => {
      registerTransaction(['result1'])

      const listener1 = jest.fn(addListener(REQUEST_EVENT))
      const listener2 = jest.fn(addListener(RESPONSE_EVENT))
      const listener3 = jest.fn(addListener(ERROR_EVENT))
      const listener4 = jest.fn(addListener(DONE_EVENT))

      const req1 = Request.get('http://foo.bar:9898/path/to/api')
        .on(REQUEST_EVENT, listener1)
        .on(RESPONSE_EVENT, listener2)
        .on(ERROR_EVENT, listener3)
        .on(DONE_EVENT, listener4)
        .off()

      await req1

      expect(events).toEqual([])

      expect(listener1.mock.calls).toHaveLength(0)
      expect(listener2.mock.calls).toHaveLength(0)
      expect(listener3.mock.calls).toHaveLength(0)
      expect(listener4.mock.calls).toHaveLength(0)
    })
  })

})
