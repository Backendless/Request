import { Buffer } from 'buffer'
import FormData from 'form-data'

import Request from '../../src'
import { cache } from '../../src/cache'
import { isBrowser, isNodeJS } from '../../src/utils'

import { registerBrowserTransaction, wait } from '../helpers'

jest.mock('../../src/utils', () => {
  const originalModule = jest.requireActual('../../src/utils')

  return {
    __esModule: true,
    ...originalModule,
    isNodeJS : jest.fn(() => false),
    isBrowser: jest.fn(() => true),
  }
})

describe('Browser Client', () => {

  afterEach(() => {
    cache.deleteAll()
  })

  describe('Request Options', () => {
    it('runs a basic request', async () => {
      const transaction = registerBrowserTransaction({ foo: 123 })

      const result = await Request.get('http://foo.bar:9898/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'GET',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })
    })

    it('runs an request without protocol', async () => {
      const transaction = registerBrowserTransaction(JSON.stringify({ foo: 123 }))

      const result = await Request.get('foo.bar/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'GET',
        'path'   : 'foo.bar/path/to/api',
        'timeout': 0
      })
    })

    it('runs an http request without port', async () => {
      const transaction = registerBrowserTransaction(JSON.stringify({ foo: 123 }))

      const result = await Request.get('http://foo.bar/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'GET',
        'path'   : 'http://foo.bar/path/to/api',
        'timeout': 0
      })
    })

    it('runs an https request without port', async () => {
      const transaction = registerBrowserTransaction(JSON.stringify({ foo: 123 }))

      const result = await Request.get('https://foo.bar/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'GET',
        'path'   : 'https://foo.bar/path/to/api',
        'timeout': 0
      })
    })

    it('runs a request with a specific status', async () => {
      const transaction = registerBrowserTransaction(JSON.stringify({ foo: 123 }), {
        statusCode   : 202,
        statusMessage: 'Spec Status'
      })

      const result = await Request.get('http://foo.bar:9898/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'GET',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })
    })

    it('returns a response with invalid JSON', async () => {
      const transaction = registerBrowserTransaction('invalid json')

      const result = await Request.get('http://foo.bar:9898/path/to/api')

      expect(result).toEqual('invalid json')

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'GET',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })
    })

    it('fails by timeout', async () => {
      registerBrowserTransaction(null, {
        failByTimeoutError: true
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
      const transaction1 = registerBrowserTransaction(null)
      const transaction2 = registerBrowserTransaction(null)
      const transaction3 = registerBrowserTransaction(null)
      const transaction4 = registerBrowserTransaction(null)

      await Request.get(`http://foo.bar/path/${encodeURIComponent('@')}/${encodeURIComponent(' ')}`)
      await Request.get(`http://foo.bar/path/%40/${encodeURIComponent(' ')}`)
      await Request.get(`http://foo.bar/path/${encodeURIComponent('@')}/%20`)
      await Request.get('http://foo.bar/path/%40/%20')

      expect(transaction1.options.path).toEqual('http://foo.bar/path/%40/%20')
      expect(transaction2.options.path).toEqual('http://foo.bar/path/%40/%20')
      expect(transaction3.options.path).toEqual('http://foo.bar/path/%40/%20')
      expect(transaction4.options.path).toEqual('http://foo.bar/path/%40/%20')
    })

    it('has specific URI components', async () => {
      const transaction1 = registerBrowserTransaction(null)
      const transaction2 = registerBrowserTransaction(null)

      await Request.get('http://foo.bar/path/@/ /абв/')
      await Request.get('http://foo.bar/path/%40/%20/%D0%B0%D0%B1%D0%B2/')

      expect(transaction1.options.path).toEqual('http://foo.bar/path/@/ /абв/')
      expect(transaction2.options.path).toEqual('http://foo.bar/path/%40/%20/%D0%B0%D0%B1%D0%B2/')
    })
  })

  describe('Request Query', () => {
    it('runs a request with primitive query', async () => {
      const transaction = registerBrowserTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .query({
          str  : 'str',
          num1 : 0,
          num2 : 123,
          bool1: true,
          bool2: false,
        })

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'GET',
        'path'   : 'http://foo.bar:9898/path/to/api?str=str&num1=0&num2=123&bool1=true&bool2=false',
        'timeout': 0
      })
    })

    it('runs a request with array in query', async () => {
      const transaction = registerBrowserTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .query({
          numArr: [1, 2, 3],
          strArr: ['a', 'b', 'c'],
        })

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'GET',
        'path'   : 'http://foo.bar:9898/path/to/api?numArr=1&numArr=2&numArr=3&strArr=a&strArr=b&strArr=c',
        'timeout': 0
      })
    })

    it('runs a request with spec characters in query', async () => {
      const transaction = registerBrowserTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .query({
          str    : 'абв',
          space  : ' ',
          percent: '%',
          at     : '@',
          strArr : ['абв', ' ', '%', '@'],
        })

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'GET',
        'path'   : 'http://foo.bar:9898/path/to/api?str=%D0%B0%D0%B1%D0%B2&space=%20&percent=%25&at=%40&strArr=%D0%B0%D0%B1%D0%B2&strArr=%20&strArr=%25&strArr=%40',
        'timeout': 0
      })
    })
  })

  describe('Request Headers', () => {
    it('runs a request with headers', async () => {
      const transaction = registerBrowserTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .set({
          header1: 'value1',
          header2: 'value3',
          header3: 'value3',
        })
        .set('header4', 'value4')

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {
          'header1': 'value1',
          'header2': 'value3',
          'header3': 'value3',
          'header4': 'value4'
        },
        'method' : 'GET',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })
    })
  })

  describe('Request Content Type', () => {
    it('runs a request with headers', async () => {
      const transaction = registerBrowserTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .type('application/pdf')

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {
          'Content-Type': 'application/pdf'
        },
        'method' : 'GET',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })
    })

    it('runs a request with application/json', async () => {
      const transaction1 = registerBrowserTransaction()
      const transaction2 = registerBrowserTransaction()

      await Request.post('http://foo.bar:9898/path/to/api', { prop: 'test' })
      await Request.post('http://foo.bar:9898/path/to/api', [1, 2, 3])

      expect(transaction1.requestBody).toEqual('{"prop":"test"}')
      expect(transaction1.options).toEqual({
        'async'  : true,
        'headers': {
          'Content-Type': 'application/json',
        },
        'method' : 'POST',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })

      expect(transaction2.requestBody).toEqual('[1,2,3]')
      expect(transaction2.options).toEqual({
        'async'  : true,
        'headers': {
          'Content-Type': 'application/json',
        },
        'method' : 'POST',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })
    })

    it('does not stringify a body', async () => {
      const transaction = registerBrowserTransaction()

      await Request.post('http://foo.bar:9898/path/to/api', JSON.stringify({ prop: 'test' }))
        .type('application/json')

      expect(transaction.requestBody).toEqual('{"prop":"test"}')
      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {
          'Content-Type': 'application/json',
        },
        'method' : 'POST',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })

    })
  })

  describe('Request Form', () => {
    it('gets FormData from the global scope', async () => {
      // NodeJS 18.x has FormData in the global scope
      expect(Request.FormData).toBe(FormData)
    })

    it('adds primitive form properties', async () => {
      const transaction = registerBrowserTransaction()

      await Request.post('http://foo.bar:9898/path/to/api')
        .form({
          str  : 'str',
          num1 : 0,
          num2 : 123,
          bool1: true,
          bool2: false,
        })

      expect(transaction.requestBody).toBeInstanceOf(FormData)

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'POST',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })
    })

    it('adds array form properties', async () => {
      const transaction = registerBrowserTransaction()

      await Request.post('http://foo.bar:9898/path/to/api')
        .form({
          arr1: [1, 2, 3],
          arr2: ['a', 'b', 'c'],
        })

      expect(transaction.requestBody).toBeInstanceOf(FormData)

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'POST',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })
    })

    it('receives a form instance', async () => {
      const transaction = registerBrowserTransaction()

      const form = new FormData()

      form.append('foo', 'bar')
      form.append('num', 123)
      form.append('arr1', 1)
      form.append('arr2', 2)
      form.append('arr3', 3)

      await Request.post('http://foo.bar:9898/path/to/api')
        .form(form)

      expect(transaction.requestBody).toBeInstanceOf(FormData)

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'POST',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })
    })
  })

  describe('Request Timeout', () => {
    it('runs a request with timeout', async () => {
      const transaction = registerBrowserTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .setTimeout(1200)

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'GET',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 1200
      })
    })
  })

  describe('Request Methods', () => {
    it('runs a GET request', async () => {
      const transaction = registerBrowserTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'GET',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })
    })

    it('runs a POST request', async () => {
      const transaction = registerBrowserTransaction()

      await Request.post('http://foo.bar:9898/path/to/api', { prop: 123 })

      expect(transaction.requestBody).toEqual('{"prop":123}')
      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {
          'Content-Type': 'application/json'
        },
        'method' : 'POST',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })
    })

    it('runs a PUT request', async () => {
      const transaction = registerBrowserTransaction()

      await Request.put('http://foo.bar:9898/path/to/api', { prop: 123 })

      expect(transaction.requestBody).toEqual('{"prop":123}')
      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {
          'Content-Type': 'application/json',
        },
        'method' : 'PUT',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })
    })

    it('runs a DELETE request', async () => {
      const transaction = registerBrowserTransaction()

      await Request.delete('http://foo.bar:9898/path/to/api', { prop: 123 })

      expect(transaction.requestBody).toEqual('{"prop":123}')
      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {
          'Content-Type': 'application/json',
        },
        'method' : 'DELETE',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })
    })
  })

  describe('Response Error', () => {
    it('fails with body', async () => {
      registerBrowserTransaction(JSON.stringify({
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

    it('fails with the client error', async () => {
      registerBrowserTransaction(null, { clientError: new Error('test client error') })

      let error = null

      try {
        await Request.get('http://foo.bar:9898/path/to/api')
      } catch (e) {
        error = e
      }

      expect(error).toBeInstanceOf(Error)

      expect({ ...error, message: error.message }).toEqual({
        'message': 'Network Error',
      })
    })

    it('fails without body', async () => {
      registerBrowserTransaction(null, {
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
        'headers': {},
        'message': 'Status Code 400 (Bad Request)',
        'status' : 400
      })
    })

    it('fails with 502', async () => {
      registerBrowserTransaction(null, {
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
        'headers': {},
        'message': 'No connection with server',
        'status' : 502
      })
    })

    it('catch an error', async () => {
      registerBrowserTransaction(null, {
        statusCode   : 502,
        statusMessage: 'Bad Gateway',
      })

      let error = null

      await Request.get('http://foo.bar:9898/path/to/api')
        .catch(e => error = e)

      expect(error).toBeInstanceOf(Error)

      expect({ ...error }).toEqual({
        'headers': {},
        'message': 'No connection with server',
        'status' : 502
      })
    })
  })

  describe('Response Body', () => {
    it('returns a buffer', async () => {
      const buffer = Buffer.from('hello world')

      const transaction = registerBrowserTransaction(buffer)

      const result = await Request.get('http://foo.bar:9898/path/to/api')
        .setEncoding(null)

      expect(result).toBeInstanceOf(Uint8Array)
      expect(new TextDecoder('utf8').decode(result)).toEqual('hello world')

      expect(transaction.options).toEqual({
        'async'       : true,
        'headers'     : {},
        'method'      : 'GET',
        'path'        : 'http://foo.bar:9898/path/to/api',
        'timeout'     : 0,
        'responseType': 'arraybuffer'
      })

    })

    it('returns the entire response', async () => {
      const transaction = registerBrowserTransaction([
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
        'async'  : true,
        'headers': {},
        'method' : 'GET',
        'path'   : 'http://foo.bar:9898/path/to/api',
        'timeout': 0
      })

    })
  })

  describe('Response Headers', () => {

    it('returns result with response headers', async () => {
      const transaction = registerBrowserTransaction({ foo: 123, str: 'hello' }, {
        headersString: 'x-real: 123\n soo bar: some text\n key:v1\nkey :v2\n key : v3'
      })

      const result = await Request.get('http://foo.bar:9898/path/to/api')
        .unwrapBody(false)

      expect(result).toEqual({
        'body'      : {
          'foo': 123,
          'str': 'hello'
        },
        'headers'   : {
          'key'    : 'v1, v2, v3',
          'soo bar': 'some text',
          'x-real' : '123'
        },
        'status'    : 200,
        'statusText': 'OK'
      })

      expect(transaction.options).toEqual({
        'async'  : true,
        'headers': {},
        'method' : 'GET',
        'path'   : 'http://foo.bar:9898/path/to/api',
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

      registerBrowserTransaction()
      registerBrowserTransaction()
      registerBrowserTransaction()
      registerBrowserTransaction()

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
          'Content-Type': 'application/json',
        }
      ])

      expect(log.mock.calls[2]).toEqual([
        'PUT',
        'http://foo.bar:9898/path/to/api',
        '[1,2,3]',
        {
          'Content-Type': 'application/json',
        }
      ])

      expect(log.mock.calls[3]).toEqual([
        'DELETE',
        'http://foo.bar:9898/path/to/api',
        'str',
        {}
      ])
    })
  })

  describe('Cache', () => {
    it('uses data from cache', async () => {
      registerBrowserTransaction('result1')

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
      registerBrowserTransaction('result1')
      registerBrowserTransaction()
      registerBrowserTransaction('result2')

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
      registerBrowserTransaction('result1')
      registerBrowserTransaction()
      registerBrowserTransaction('result2')

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
      registerBrowserTransaction('result1')
      registerBrowserTransaction('result2')

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
      registerBrowserTransaction('result1')
      registerBrowserTransaction('result2')

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
      const oldFlushInterval = cache.flushInterval
      cache.setFlushInterval(500)

      registerBrowserTransaction('result1')
      registerBrowserTransaction('result2')

      const result1 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1', 'tag2')
        .useCache(300)

      await wait(2000)

      const result2 = await Request.get('http://foo.bar:9898/path/to/api')
        .cacheTags('tag1')
        .useCache()

      expect(result1).toBe('result1')
      expect(result2).toBe('result2')

      cache.setFlushInterval(oldFlushInterval)
    })

    it('resets cache by POST request', async () => {
      registerBrowserTransaction('result1')
      registerBrowserTransaction()
      registerBrowserTransaction('result2')

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
      registerBrowserTransaction('result1')
      registerBrowserTransaction()
      registerBrowserTransaction('result2')

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
      registerBrowserTransaction('result1')
      registerBrowserTransaction()
      registerBrowserTransaction('result2')

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
      registerBrowserTransaction('result1')

      const req = Request.get('http://foo.bar:9898/path/to/api')
        .on(REQUEST_EVENT, addListener(REQUEST_EVENT))

      await req

      expect(events).toEqual([
        [REQUEST_EVENT, [req]]
      ])
    })

    it('listens RESPONSE event', async () => {
      registerBrowserTransaction('result1')

      const req = Request.get('http://foo.bar:9898/path/to/api')
        .on(RESPONSE_EVENT, addListener(RESPONSE_EVENT))

      await req

      expect(events).toEqual([
        [RESPONSE_EVENT, ['result1']]
      ])
    })

    it('listens ERROR event', async () => {
      registerBrowserTransaction(null, { failByTimeoutError: true })

      const req = Request.get('http://foo.bar:9898/path/to/api')
        .on(ERROR_EVENT, addListener(ERROR_EVENT))

      await req.catch(_ => _)

      expect(events).toEqual([
        [ERROR_EVENT, [new Error('Connection aborted due to timeout')]]
      ])
    })

    it('listens DONE event', async () => {
      registerBrowserTransaction('result1')
      registerBrowserTransaction(null, { failByTimeoutError: true })

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
      registerBrowserTransaction('result1')

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
      registerBrowserTransaction('result1')

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
      registerBrowserTransaction('result1')

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

  describe('Utils', () => {

    it('determines running env', async () => {
      global.window = { document: 'test' }

      const process = global.process

      delete global.process

      expect({ isBrowser: isBrowser(), isNodeJS: isNodeJS() }).toEqual({
        isBrowser: true,
        isNodeJS : false
      })

      delete global.window

      global.process = process
    })

  })

})
