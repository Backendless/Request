import { Buffer } from 'buffer'
import https from 'https'
import FormData from 'form-data'

import Request from '../../src'

import { EventEmitter, registerNodeTransaction } from '../helpers'
import { isBrowser, isNodeJS } from '../../src/utils'

jest.mock('../../src/utils', () => {
  const originalModule = jest.requireActual('../../src/utils')

  return {
    __esModule: true,
    ...originalModule,
    isNodeJS : jest.fn(() => true),
    isBrowser: jest.fn(() => false),
  }
})

describe('Node Client', () => {

  describe('Request Options', () => {
    it('runs a basic request', async () => {
      const transaction = registerNodeTransaction(JSON.stringify({ foo: 123 }))

      const result = await Request.get('http://foo.bar:9898/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false,
      })
    })

    it('runs an request without protocol', async () => {
      const transaction = registerNodeTransaction(JSON.stringify({ foo: 123 }))

      const result = await Request.get('foo.bar/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : null,
        'method'         : 'GET',
        'path'           : 'foo.bar/path/to/api',
        'port'           : 80,
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('runs an http request without port', async () => {
      const transaction = registerNodeTransaction(JSON.stringify({ foo: 123 }))

      const result = await Request.get('http://foo.bar/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : 80,
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('runs an https request without port', async () => {
      const transaction = registerNodeTransaction(JSON.stringify({ foo: 123 }))

      const result = await Request.get('https://foo.bar/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : 443,
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('runs a request with a specific status', async () => {
      const transaction = registerNodeTransaction(JSON.stringify({ foo: 123 }), {
        statusCode: 202, statusMessage: 'Spec Status'
      })

      const result = await Request.get('http://foo.bar:9898/path/to/api')

      expect(result).toEqual({ foo: 123 })

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('returns a response with invalid JSON', async () => {
      const transaction = registerNodeTransaction('invalid json')

      const result = await Request.get('http://foo.bar:9898/path/to/api')

      expect(result).toEqual('invalid json')

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('fails by timeout', async () => {
      registerNodeTransaction(null, {
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
    it('should not add an extra slash at the pathname end', async () => {
      const transaction = registerNodeTransaction(null)

      await Request.get('https://test-image-url.com')

      expect(transaction.options.path).toEqual('')
    })

    it('should encode URL', async () => {
      const transaction = registerNodeTransaction(null)

      await Request.get('http://foo.bar/path/@/ /абв/')

      expect(transaction.options.path).toEqual('/path/@/%20/%D0%B0%D0%B1%D0%B2/')
    })

    it('should keep the last slash in URL with query params', async () => {
      const transaction = registerNodeTransaction(null)

      await Request.get('http://foo.bar/path/?foo=bar')

      expect(transaction.options.path).toEqual('/path/?foo=bar')
    })

    it('should keep the last slash in URL with query params #1', async () => {
      const transaction = registerNodeTransaction(null)

      await Request.get('http://foo.bar/path/').query({ q: "'" })

      expect(transaction.options.path).toEqual('/path/?q=%27')
    })

    it('should keep the last slash in URL with query params #2', async () => {
      const transaction = registerNodeTransaction(null)

      await Request.get('http://foo.bar/path/').query({ q: 'тест' })

      expect(transaction.options.path).toEqual('/path/?q=%D1%82%D0%B5%D1%81%D1%82')
    })

    it('should not add a slash to the URL end', async () => {
      const transaction1 = registerNodeTransaction(null)
      const transaction2 = registerNodeTransaction(null)

      await Request.get('http://foo.bar')
      await Request.get('http://foo.bar/path')

      expect(transaction1.options.path).toEqual('')
      expect(transaction2.options.path).toEqual('/path')
    })

    it('should not encode already encoded URI components with #', async () => {
      const transaction1 = registerNodeTransaction(null)

      await Request.get(`http://localhost:3001/foo/${encodeURIComponent('S#S##S#')}/bar`)

      expect(transaction1.options.path).toEqual('/foo/S%23S%23%23S%23/bar')
    })

    it('should not encode already encoded URI components', async () => {
      const transaction1 = registerNodeTransaction(null)
      const transaction2 = registerNodeTransaction(null)
      const transaction3 = registerNodeTransaction(null)
      const transaction4 = registerNodeTransaction(null)
      const transaction5 = registerNodeTransaction(null)
      const transaction6 = registerNodeTransaction(null)

      await Request.get(`http://foo.bar/path/${encodeURIComponent('@')}/${encodeURIComponent(' ')}`)
      await Request.get(`http://foo.bar/path/%40/${encodeURIComponent(' ')}`)
      await Request.get(`http://foo.bar/path/${encodeURIComponent('@')}/%20`)
      await Request.get('http://foo.bar/path/%40/%20')
      await Request.get('http://foo.bar/path/%3A')
      await Request.get('http://foo.bar/path/%2F')

      expect(transaction1.options.path).toEqual('/path/%40/%20')
      expect(transaction2.options.path).toEqual('/path/%40/%20')
      expect(transaction3.options.path).toEqual('/path/%40/%20')
      expect(transaction4.options.path).toEqual('/path/%40/%20')
      expect(transaction5.options.path).toEqual('/path/%3A')
      expect(transaction6.options.path).toEqual('/path/%2F')
    })

    it('has specific URI components and keeps a slash at the url end', async () => {
      const transaction1 = registerNodeTransaction(null)
      const transaction2 = registerNodeTransaction(null)
      const transaction3 = registerNodeTransaction(null)
      const transaction4 = registerNodeTransaction(null)

      await Request.get('http://foo.bar/path/with/email/valid@email.com/')
      await Request.get('http://foo.bar/path/@/ /абв/')
      await Request.get('http://foo.bar/path/%40/%20/%D0%B0%D0%B1%D0%B2/')
      await Request.get('http://foo.bar/foo:bar/')

      expect(transaction1.options.path).toEqual('/path/with/email/valid@email.com/')
      expect(transaction2.options.path).toEqual('/path/@/%20/%D0%B0%D0%B1%D0%B2/')
      expect(transaction3.options.path).toEqual('/path/%40/%20/%D0%B0%D0%B1%D0%B2/')
      expect(transaction4.options.path).toEqual('/foo:bar/')
    })

    it('specific case #1', async () => {
      const transaction = registerNodeTransaction(null)

      await Request.get('https://docs.googleapis.com/v1/documents/10psXGc-EW3vkeGXP0qG3v66Q-uo:batchUpdate')

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'docs.googleapis.com',
        'method'         : 'GET',
        'path'           : '/v1/documents/10psXGc-EW3vkeGXP0qG3v66Q-uo:batchUpdate',
        'port'           : 443,
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('exclude uri hash', async () => {
      const transaction1 = registerNodeTransaction(null)
      const transaction2 = registerNodeTransaction(null)
      const transaction3 = registerNodeTransaction(null)

      await Request.get('http://localhost:3001/foo#num=123')
      await Request.get('http://localhost:3001/foo#bar=bar&str=test')
      await Request.get('http://localhost:3001/foo?q=name#bar=bar&str=test')

      expect(transaction1.options.path).toEqual('/foo')
      expect(transaction2.options.path).toEqual('/foo')
      expect(transaction3.options.path).toEqual('/foo?q=name')
    })
  })

  describe('Request Query', () => {
    it('runs a request with primitive query', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .query({
          str: 'str', num1: 0, num2: 123, bool1: true, bool2: false,
        })

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api?str=str&num1=0&num2=123&bool1=true&bool2=false',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('runs a request with array in query', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .query({
          numArr: [1, 2, 3], strArr: ['a', 'b', 'c'],
        })

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api?numArr=1&numArr=2&numArr=3&strArr=a&strArr=b&strArr=c',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('runs a request with spec characters in query', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .query({
          str: 'абв', space: ' ', percent: '%', at: '@', strArr: ['абв', ' ', '%', '@'],
        })

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api?str=%D0%B0%D0%B1%D0%B2&space=%20&percent=%25&at=%40&strArr=%D0%B0%D0%B1%D0%B2&strArr=%20&strArr=%25&strArr=%40',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })
  })

  describe('Request Headers', () => {
    it('runs a request with headers', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .set({
          header1: 'value1', header2: 'value3', header3: 'value3',
        })
        .set('header4', 'value4')

      expect(transaction.options).toEqual({
        'headers'        : { 'header1': 'value1', 'header2': 'value3', 'header3': 'value3', 'header4': 'value4' },
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('runs a request with basicAuth header', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .basicAuth({ token: 'my-basic-auth-token' })

      expect(transaction.options).toEqual({
        'headers'        : { 'Authorization': 'Basic my-basic-auth-token' },
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('does not set Authorization header when basicAuth is not passed', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .basicAuth()

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('runs a request with authKey header', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .authKey('my-auth-key')

      expect(transaction.options).toEqual({
        'headers'        : { 'auth-key': 'my-auth-key' },
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('does not set auth-key header when authKey is not passed', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .authKey()

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('combines basicAuth, authKey and custom headers', async () => {
      const transaction = registerNodeTransaction()

      const request = Request.get('http://foo.bar:9898/path/to/api')

      expect(request.basicAuth({ token: 'my-basic-auth-token' })).toBe(request)
      expect(request.authKey('my-auth-key')).toBe(request)

      await request.set('header1', 'value1')

      expect(transaction.options).toEqual({
        'headers'        : {
          'Authorization': 'Basic my-basic-auth-token',
          'auth-key'     : 'my-auth-key',
          'header1'      : 'value1',
        },
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })
  })

  describe('Client Certificate', () => {
    const CLIENT_CERT = '-----BEGIN CERTIFICATE-----\nfake-client-certificate\n-----END CERTIFICATE-----'
    const CLIENT_KEY = '-----BEGIN ENCRYPTED PRIVATE KEY-----\nfake-private-key\n-----END ENCRYPTED PRIVATE KEY-----'
    const KEY_PASSPHRASE = '123456'
    const CA_BUNDLE = '-----BEGIN CERTIFICATE-----\nfake-ca-bundle\n-----END CERTIFICATE-----'

    const baseOptions = {
      'headers'        : {},
      'host'           : 'foo.bar',
      'method'         : 'GET',
      'path'           : '/path/to/api',
      'port'           : 443,
      'timeout'        : 0,
      'withCredentials': false,
    }

    // makes the http client fail the way node does, either while building the secure context
    // (a synchronous throw) or later on, once the handshake is already running
    const registerFailingNodeTransaction = (error, { sync } = {}) => {
      jest.spyOn(https, 'request').mockImplementationOnce(() => {
        if (sync) {
          throw error
        }

        const req = new EventEmitter()

        req.write = () => undefined
        req.end = () => setImmediate(() => req.emit('error', error))

        return req
      })
    }

    const failureOf = async request => {
      try {
        await request

        throw new Error('the request was expected to fail')
      } catch (error) {
        return error
      }
    }

    it('sends the client certificate and the private key', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('https://foo.bar/path/to/api')
        .cert({ cert: CLIENT_CERT, key: CLIENT_KEY })

      expect(transaction.options).toEqual({
        ...baseOptions,
        'cert': CLIENT_CERT,
        'key' : CLIENT_KEY,
      })
    })

    it('sends the passphrase of an encrypted private key and a custom CA bundle', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('https://foo.bar/path/to/api')
        .cert({ cert: CLIENT_CERT, key: CLIENT_KEY, passphrase: KEY_PASSPHRASE, ca: CA_BUNDLE })

      expect(transaction.options).toEqual({
        ...baseOptions,
        'cert'      : CLIENT_CERT,
        'key'       : CLIENT_KEY,
        'passphrase': KEY_PASSPHRASE,
        'ca'        : CA_BUNDLE,
      })
    })

    it('merges options collected over several calls and is chainable', async () => {
      const transaction = registerNodeTransaction()

      const request = Request.get('https://foo.bar/path/to/api')

      expect(request.cert({ cert: CLIENT_CERT })).toBe(request)
      expect(request.cert({ key: CLIENT_KEY, passphrase: KEY_PASSPHRASE })).toBe(request)
      expect(request.cert({ passphrase: 'overridden-passphrase' })).toBe(request)

      await request

      expect(transaction.options).toEqual({
        ...baseOptions,
        'cert'      : CLIENT_CERT,
        'key'       : CLIENT_KEY,
        'passphrase': 'overridden-passphrase',
      })
    })

    it('ignores options which are not certificate material', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('https://foo.bar/path/to/api')
        .cert({ cert: CLIENT_CERT, key: CLIENT_KEY, rejectUnauthorized: false, agent: 'my-agent' })

      expect(transaction.options).toEqual({
        ...baseOptions,
        'cert': CLIENT_CERT,
        'key' : CLIENT_KEY,
      })
    })

    it('does not change the request when there is nothing to attach', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('https://foo.bar/path/to/api')
        .cert()
        .cert({})
        .cert({ cert: undefined, key: null })

      expect(transaction.options).toEqual(baseOptions)
    })

    it('sends the client certificate with a body, a token request needs it too', async () => {
      const transaction = registerNodeTransaction()

      await Request.post('https://foo.bar/oauth2/token')
        .cert({ cert: CLIENT_CERT, key: CLIENT_KEY })
        .type('application/x-www-form-urlencoded')
        .send('grant_type=client_credentials')

      expect(transaction.requestBody).toEqual('grant_type=client_credentials')

      expect(transaction.options).toEqual({
        ...baseOptions,
        'headers': {
          'Content-Type'  : 'application/x-www-form-urlencoded',
          'content-length': 29,
        },
        'method' : 'POST',
        'path'   : '/oauth2/token',
        'cert'   : CLIENT_CERT,
        'key'    : CLIENT_KEY,
      })
    })

    it('sends the client certificate with a form body', async () => {
      const transaction = registerNodeTransaction()

      const form = new FormData()
      form.append('foo', 'bar')

      await Request.post('https://foo.bar/path/to/api')
        .cert({ cert: CLIENT_CERT, key: CLIENT_KEY })
        .form(form)

      expect(transaction.options.cert).toEqual(CLIENT_CERT)
      expect(transaction.options.key).toEqual(CLIENT_KEY)
    })

    it('refuses to send a client certificate over a non https url', async () => {
      const error = await failureOf(
        Request.get('http://foo.bar:9898/path/to/api').cert({ cert: CLIENT_CERT, key: CLIENT_KEY })
      )

      expect(error.name).toEqual('TLSError')
      expect(error.code).toEqual('TLS_ERROR')
      expect(error.message).toEqual('A client certificate can only be used with an https:// URL.')
    })

    it('refuses to send a client certificate to a url without a protocol', async () => {
      const error = await failureOf(
        Request.get('foo.bar/path/to/api').cert({ cert: CLIENT_CERT, key: CLIENT_KEY })
      )

      expect(error.name).toEqual('TLSError')
      expect(error.message).toEqual('A client certificate can only be used with an https:// URL.')
    })

    it('keeps the private key out of the request instance and of the verbose log', async () => {
      const log = jest.spyOn(console, 'log').mockImplementation()

      registerNodeTransaction()

      Request.verbose = true

      const request = Request.post('https://foo.bar/path/to/api')
        .cert({ cert: CLIENT_CERT, key: CLIENT_KEY, passphrase: KEY_PASSPHRASE, ca: CA_BUNDLE })

      await request.send({ num: 123 })

      Request.verbose = false

      expect(Object.keys(request)).not.toContain('tlsOptions')
      expect(JSON.stringify(request)).not.toContain('fake-private-key')

      const logged = JSON.stringify(log.mock.calls)

      expect(log.mock.calls).toHaveLength(1)
      expect(logged).not.toContain('fake-private-key')
      expect(logged).not.toContain('fake-client-certificate')
      expect(logged).not.toContain(KEY_PASSPHRASE)
    })

    it('reports an encrypted private key which could not be decrypted', async () => {
      registerFailingNodeTransaction(Object.assign(
        new Error('error:06065064:digital envelope routines:EVP_DecryptFinal_ex:bad decrypt'),
        { code: 'ERR_OSSL_EVP_BAD_DECRYPT' }
      ), { sync: true })

      const error = await failureOf(
        Request.get('https://foo.bar/path/to/api').cert({ cert: CLIENT_CERT, key: CLIENT_KEY })
      )

      expect(error.name).toEqual('TLSError')
      expect(error.code).toEqual('ERR_OSSL_EVP_BAD_DECRYPT')
      expect(error.message).toEqual(
        'The private key could not be decrypted, the passphrase is missing or incorrect. (ERR_OSSL_EVP_BAD_DECRYPT)'
      )
    })

    it('reports certificate material which is not valid PEM', async () => {
      registerFailingNodeTransaction(Object.assign(
        new Error('error:0909006C:PEM routines:get_name:no start line'),
        { code: 'ERR_OSSL_PEM_NO_START_LINE' }
      ), { sync: true })

      const error = await failureOf(
        Request.get('https://foo.bar/path/to/api').cert({ cert: 'not-a-pem', key: CLIENT_KEY })
      )

      expect(error.message).toEqual(
        'The client certificate or the private key is not valid PEM. (ERR_OSSL_PEM_NO_START_LINE)'
      )
    })

    it('reports a server which demands a client certificate before anything else', async () => {
      registerFailingNodeTransaction(Object.assign(
        new Error('error:0A00045C:SSL routines:ssl3_read_bytes:tlsv13 alert certificate required'),
        { code: 'ERR_SSL_TLSV13_ALERT_CERTIFICATE_REQUIRED' }
      ))

      const error = await failureOf(Request.get('https://foo.bar/path/to/api'))

      expect(error.name).toEqual('TLSError')
      expect(error.message).toEqual(
        'The server requires a client certificate and none was supplied. (ERR_SSL_TLSV13_ALERT_CERTIFICATE_REQUIRED)'
      )
    })

    it('reports a client certificate the server rejected as revoked', async () => {
      registerFailingNodeTransaction(Object.assign(
        new Error('write EPROTO ... sslv3 alert certificate revoked'),
        { code: 'EPROTO' }
      ))

      const error = await failureOf(
        Request.get('https://foo.bar/path/to/api').cert({ cert: CLIENT_CERT, key: CLIENT_KEY })
      )

      expect(error.message).toEqual(
        'The server rejected the client certificate because it has been revoked. (EPROTO)'
      )
    })

    it('reports a handshake the server refused without naming a reason', async () => {
      registerFailingNodeTransaction(Object.assign(
        new Error('write EPROTO ... sslv3 alert handshake failure'),
        { code: 'EPROTO' }
      ))

      const error = await failureOf(
        Request.get('https://foo.bar/path/to/api').cert({ cert: CLIENT_CERT, key: CLIENT_KEY })
      )

      expect(error.message).toEqual(
        'The server rejected the TLS handshake, the client certificate is missing or was rejected. (EPROTO)'
      )
    })

    it('reports a private key which does not match the client certificate', async () => {
      registerFailingNodeTransaction(Object.assign(
        new Error('error:05800074:x509 certificate routines:X509_check_private_key:key values mismatch'),
        { code: 'ERR_OSSL_X509_KEY_VALUES_MISMATCH' }
      ), { sync: true })

      const error = await failureOf(
        Request.get('https://foo.bar/path/to/api').cert({ cert: CLIENT_CERT, key: CLIENT_KEY })
      )

      expect(error.message).toEqual(
        'The private key does not match the client certificate. (ERR_OSSL_X509_KEY_VALUES_MISMATCH)'
      )
    })

    it('keeps the original error available as the cause', async () => {
      const cause = Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' })

      registerFailingNodeTransaction(cause)

      const error = await failureOf(
        Request.get('https://foo.bar/path/to/api').cert({ cert: CLIENT_CERT, key: CLIENT_KEY })
      )

      expect(error.cause).toBe(cause)
    })

    it('reports a client certificate the server rejected as expired', async () => {
      registerFailingNodeTransaction(Object.assign(
        new Error('write EPROTO ... alert certificate expired'),
        { code: 'EPROTO' }
      ))

      const error = await failureOf(
        Request.get('https://foo.bar/path/to/api').cert({ cert: CLIENT_CERT, key: CLIENT_KEY })
      )

      expect(error.name).toEqual('TLSError')
      expect(error.message).toEqual(
        'The server rejected the client certificate because it has expired. (EPROTO)'
      )
    })

    it('reports a client certificate issued by an authority the server does not trust', async () => {
      registerFailingNodeTransaction(Object.assign(
        new Error('write EPROTO ... tlsv1 alert unknown ca'),
        { code: 'EPROTO' }
      ))

      const error = await failureOf(
        Request.get('https://foo.bar/path/to/api').cert({ cert: CLIENT_CERT, key: CLIENT_KEY })
      )

      expect(error.message).toEqual(
        'The server does not trust the authority which issued the client certificate. (EPROTO)'
      )
    })

    it('reports a server which closes the connection during the handshake', async () => {
      registerFailingNodeTransaction(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }))

      const error = await failureOf(
        Request.get('https://foo.bar/path/to/api').cert({ cert: CLIENT_CERT, key: CLIENT_KEY })
      )

      expect(error.name).toEqual('TLSError')
      expect(error.message).toEqual(
        'The connection was closed during the TLS handshake, '
        + 'the client certificate was most likely missing, rejected or expired. (ECONNRESET)'
      )
    })

    it('reports a server certificate which can not be verified with the given CA bundle', async () => {
      registerFailingNodeTransaction(Object.assign(
        new Error('unable to verify the first certificate'),
        { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }
      ))

      const error = await failureOf(
        Request.get('https://foo.bar/path/to/api').cert({ cert: CLIENT_CERT, key: CLIENT_KEY, ca: CA_BUNDLE })
      )

      expect(error.message).toEqual(
        'The server certificate could not be verified, a CA bundle may be required. '
        + '(UNABLE_TO_VERIFY_LEAF_SIGNATURE)'
      )
    })

    it('reports an expired server certificate even without a client certificate', async () => {
      registerFailingNodeTransaction(Object.assign(
        new Error('certificate has expired'),
        { code: 'CERT_HAS_EXPIRED' }
      ))

      const error = await failureOf(Request.get('https://foo.bar/path/to/api'))

      expect(error.name).toEqual('TLSError')
      expect(error.message).toEqual('The server certificate has expired. (CERT_HAS_EXPIRED)')
    })

    it('leaves a dropped connection alone when there is no client certificate', async () => {
      registerFailingNodeTransaction(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }))

      const error = await failureOf(Request.get('https://foo.bar/path/to/api'))

      expect(error.name).toEqual('Error')
      expect(error.message).toEqual('socket hang up')
    })

    it('leaves an error which has nothing to do with TLS alone', async () => {
      registerFailingNodeTransaction(Object.assign(
        new Error('connect ECONNREFUSED 127.0.0.1:443'),
        { code: 'ECONNREFUSED' }
      ))

      const error = await failureOf(
        Request.get('https://foo.bar/path/to/api').cert({ cert: CLIENT_CERT, key: CLIENT_KEY })
      )

      expect(error.name).toEqual('Error')
      expect(error.message).toEqual('connect ECONNREFUSED 127.0.0.1:443')
    })
  })

  describe('Request Content Type', () => {
    it('runs a request with headers', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .type('application/pdf')

      expect(transaction.options).toEqual({
        'headers'        : {
          'Content-Type': 'application/pdf',
        },
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('runs a request with application/json', async () => {
      const transaction1 = registerNodeTransaction()
      const transaction2 = registerNodeTransaction()

      await Request.post('http://foo.bar:9898/path/to/api', { prop: 'test' })
      await Request.post('http://foo.bar:9898/path/to/api', [1, 2, 3])

      expect(transaction1.requestBody).toEqual('{"prop":"test"}')
      expect(transaction1.options).toEqual({
        'headers'        : {
          'Content-Type': 'application/json', 'content-length': 15
        },
        'host'           : 'foo.bar',
        'method'         : 'POST',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })

      expect(transaction2.requestBody).toEqual('[1,2,3]')
      expect(transaction2.options).toEqual({
        'headers'        : {
          'Content-Type': 'application/json', 'content-length': 7
        },
        'host'           : 'foo.bar',
        'method'         : 'POST',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('does not stringify a body', async () => {
      const transaction = registerNodeTransaction()

      await Request.post('http://foo.bar:9898/path/to/api', JSON.stringify({ prop: 'test' }))
        .type('application/json')

      expect(transaction.requestBody).toEqual('{"prop":"test"}')
      expect(transaction.options).toEqual({
        'headers'        : {
          'Content-Type': 'application/json', 'content-length': 15
        },
        'host'           : 'foo.bar',
        'method'         : 'POST',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })

    })
  })

  describe('Request Form', () => {
    it('does not get FormData from the global scope for NodeJS', async () => {
      global.FormData = 123

      expect(Request.FormData).toBe(require('form-data'))

      delete global.FormData
    })

    it('uses Custom FormData', async () => {
      Request.FormData = 123
      expect(Request.FormData).toBe(123)
      Request.FormData = null
      expect(Request.FormData).toBe(require('form-data'))

      Request.FormData = 123
      expect(Request.FormData).toBe(123)
      expect(() => delete Request.FormData).toThrow('Cannot delete property \'FormData\' of function Request')
      expect(Request.FormData).toBe(123)

      Request.FormData = null
    })

    it('gets FormData from the node_modules', async () => {
      expect(Request.FormData).toBe(require('form-data'))
    })

    it('adds primitive form properties', async () => {
      const transaction = registerNodeTransaction()

      await Request.post('http://foo.bar:9898/path/to/api')
        .form({
          str: 'str', num1: 0, num2: 123, bool1: true, bool2: false,
        })

      expect(transaction.requestForm).toBeInstanceOf(FormData)

      expect(transaction.options).toEqual({
        'headers'        : {
          'content-length': 579, 'content-type': `multipart/form-data; boundary=${transaction.requestForm._boundary}`
        },
        'host'           : 'foo.bar',
        'method'         : 'POST',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('adds array form properties', async () => {
      const transaction = registerNodeTransaction()

      await Request.post('http://foo.bar:9898/path/to/api')
        .form({
          arr1: [1, 2, 3], arr2: ['a', 'b', 'c'],
        })

      expect(transaction.requestForm).toBeInstanceOf(FormData)

      expect(transaction.options).toEqual({
        'headers'        : {
          'content-length': 680, 'content-type': `multipart/form-data; boundary=${transaction.requestForm._boundary}`
        },
        'host'           : 'foo.bar',
        'method'         : 'POST',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('receives a form instance', async () => {
      const transaction = registerNodeTransaction()

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
        'headers'        : {
          'content-length': 578, 'content-type': `multipart/form-data; boundary=${transaction.requestForm._boundary}`
        },
        'host'           : 'foo.bar',
        'method'         : 'POST',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })
  })

  describe('Request Timeout', () => {
    it('runs a request with timeout', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')
        .setTimeout(1200)

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 1200,
        'withCredentials': false
      })
    })
  })

  describe('Request Methods', () => {
    it('runs a GET request', async () => {
      const transaction = registerNodeTransaction()

      await Request.get('http://foo.bar:9898/path/to/api')

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('runs a POST request', async () => {
      const transaction = registerNodeTransaction()

      await Request.post('http://foo.bar:9898/path/to/api', { prop: 123 })

      expect(transaction.requestBody).toEqual('{"prop":123}')
      expect(transaction.options).toEqual({
        'headers'        : {
          'Content-Type': 'application/json', 'content-length': 12
        },
        'host'           : 'foo.bar',
        'method'         : 'POST',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('runs a PUT request', async () => {
      const transaction = registerNodeTransaction()

      await Request.put('http://foo.bar:9898/path/to/api', { prop: 123 })

      expect(transaction.requestBody).toEqual('{"prop":123}')
      expect(transaction.options).toEqual({
        'headers'        : {
          'Content-Type': 'application/json', 'content-length': 12
        },
        'host'           : 'foo.bar',
        'method'         : 'PUT',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('runs a DELETE request', async () => {
      const transaction = registerNodeTransaction()

      await Request.delete('http://foo.bar:9898/path/to/api', { prop: 123 })

      expect(transaction.requestBody).toEqual('{"prop":123}')
      expect(transaction.options).toEqual({
        'headers'        : {
          'Content-Type': 'application/json', 'content-length': 12
        },
        'host'           : 'foo.bar',
        'method'         : 'DELETE',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('runs a PATCH request', async () => {
      const transaction = registerNodeTransaction()

      await Request.patch('http://foo.bar:9898/path/to/api', { prop: 123 })

      expect(transaction.requestBody).toEqual('{"prop":123}')
      expect(transaction.options).toEqual({
        'headers'        : {
          'Content-Type': 'application/json', 'content-length': 12
        },
        'host'           : 'foo.bar',
        'method'         : 'PATCH',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('runs a HEAD request', async () => {
      const transaction = registerNodeTransaction()

      await Request.head('http://foo.bar:9898/path/to/api')

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'HEAD',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })

    it('runs an OPTIONS request', async () => {
      const transaction = registerNodeTransaction()

      await Request.options('http://foo.bar:9898/path/to/api')

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'OPTIONS',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })
    })
  })

  describe('Response Error', () => {

    it('fails with the client error', async () => {
      registerNodeTransaction(null, { clientError: new Error('test client error') })

      let error = null

      try {
        await Request.get('http://foo.bar:9898/path/to/api')
      } catch (e) {
        error = e
      }

      expect(error).toBeInstanceOf(Error)

      expect({ ...error, message: error.message }).toEqual({
        'message': 'test client error'
      })
    })

    it('fails with body', async () => {
      registerNodeTransaction(JSON.stringify({
        message: 'Error from the server', code: 1234,
      }), {
        statusCode: 400, statusMessage: 'Bad Request',
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
          'code': 1234, 'message': 'Error from the server'
        }, 'code': 1234, 'headers': {}, 'message': 'Error from the server', 'status': 400
      })
    })

    it('fails without body', async () => {
      registerNodeTransaction(null, {
        statusCode: 400, statusMessage: 'Bad Request',
      })

      let error = null

      try {
        await Request.get('http://foo.bar:9898/path/to/api')
      } catch (e) {
        error = e
      }

      expect(error).toBeInstanceOf(Error)

      expect({ ...error }).toEqual({
        'body': '', 'headers': {}, 'message': 'Status Code 400 (Bad Request)', 'status': 400
      })
    })

    it('fails with 502', async () => {
      registerNodeTransaction(null, {
        statusCode: 502, statusMessage: 'Bad Gateway',
      })

      let error = null

      try {
        await Request.get('http://foo.bar:9898/path/to/api')
      } catch (e) {
        error = e
      }

      expect(error).toBeInstanceOf(Error)

      expect({ ...error }).toEqual({
        'body': '', 'headers': {}, 'message': 'No connection with server', 'status': 502
      })
    })

    it('catch an error', async () => {
      registerNodeTransaction(null, {
        statusCode: 502, statusMessage: 'Bad Gateway',
      })

      let error = null

      await Request.get('http://foo.bar:9898/path/to/api')
        .catch(e => error = e)

      expect(error).toBeInstanceOf(Error)

      expect({ ...error }).toEqual({
        'body': '', 'headers': {}, 'message': 'No connection with server', 'status': 502
      })
    })
  })

  describe('Response Body', () => {
    it('receives a couple of buffers', async () => {
      const buffer = Buffer.from(JSON.stringify({ foo: 123, str: 'hello' }))

      const transaction = registerNodeTransaction([buffer.slice(0, buffer.length / 2), buffer.slice(buffer.length / 2, buffer.length),])

      const result = await Request.get('http://foo.bar:9898/path/to/api')

      expect(result).toEqual({ foo: 123, str: 'hello' })

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })

    })

    it('returns a buffer', async () => {
      const buffer = Buffer.from('hello world')

      const transaction = registerNodeTransaction([buffer.slice(0, buffer.length / 2), buffer.slice(buffer.length / 2, buffer.length),])

      const result = await Request.get('http://foo.bar:9898/path/to/api')
        .setEncoding(null)

      expect(result).toBeInstanceOf(Buffer)
      expect(result.toString('utf8')).toEqual('hello world')

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })

    })

    it('returns the entire response', async () => {
      const transaction = registerNodeTransaction([JSON.stringify({ foo: 123, str: 'hello' }),])

      const result = await Request.get('http://foo.bar:9898/path/to/api')
        .unwrapBody(false)

      expect(result).toEqual({
        'body'      : {
          'foo': 123, 'str': 'hello'
        }, 'headers': {}, 'status': 200, 'statusText': 'OK'
      })

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })

    })
  })

  describe('Response Headers', () => {

    it('returns result with response headers', async () => {
      const transaction = registerNodeTransaction([JSON.stringify({ foo: 123, str: 'hello' }),], {
        headers: {
          'key': 'v1, v2, v3', 'soo bar': 'some text', 'x-real': '123'
        }
      })

      const result = await Request.get('http://foo.bar:9898/path/to/api')
        .unwrapBody(false)

      expect(result).toEqual({
        'body'      : {
          'foo': 123, 'str': 'hello'
        }, 'headers': {
          'key': 'v1, v2, v3', 'soo bar': 'some text', 'x-real': '123'
        }, 'status' : 200, 'statusText': 'OK'
      })

      expect(transaction.options).toEqual({
        'headers'        : {},
        'host'           : 'foo.bar',
        'method'         : 'GET',
        'path'           : '/path/to/api',
        'port'           : '9898',
        'timeout'        : 0,
        'withCredentials': false
      })

    })
  })

  describe('Verbose', () => {
    afterEach(() => {
      Request.verbose = false
    })

    it('receives a couple of buffers', async () => {
      const log = jest.spyOn(console, 'log').mockImplementation()

      registerNodeTransaction()
      registerNodeTransaction()
      registerNodeTransaction()
      registerNodeTransaction()

      Request.verbose = true

      await Request.get('http://foo.bar:9898/path/to/api')
      await Request.post('http://foo.bar:9898/path/to/api', { num: 123 })
      await Request.put('http://foo.bar:9898/path/to/api', [1, 2, 3])
      await Request.delete('http://foo.bar:9898/path/to/api', 'str')

      expect(log.mock.calls).toHaveLength(4)

      expect(log.mock.calls[0]).toEqual(['GET', 'http://foo.bar:9898/path/to/api', undefined, {}])

      expect(log.mock.calls[1]).toEqual(['POST', 'http://foo.bar:9898/path/to/api', '{"num":123}', {
        'Content-Type': 'application/json', 'content-length': 11
      }])

      expect(log.mock.calls[2]).toEqual(['PUT', 'http://foo.bar:9898/path/to/api', '[1,2,3]', {
        'Content-Type': 'application/json', 'content-length': 7
      }])

      expect(log.mock.calls[3]).toEqual(['DELETE', 'http://foo.bar:9898/path/to/api', 'str', {
        'content-length': 3
      }])
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
      registerNodeTransaction(['result1'])

      const req = Request.get('http://foo.bar:9898/path/to/api')
        .on(REQUEST_EVENT, addListener(REQUEST_EVENT))

      await req

      expect(events).toEqual([[REQUEST_EVENT, [req]]])
    })

    it('listens RESPONSE event', async () => {
      registerNodeTransaction(['result1'])

      const req = Request.get('http://foo.bar:9898/path/to/api')
        .on(RESPONSE_EVENT, addListener(RESPONSE_EVENT))

      await req

      expect(events).toEqual([[RESPONSE_EVENT, ['result1']]])
    })

    it('listens ERROR event', async () => {
      registerNodeTransaction(null, { failByTimeoutError: true })

      const req = Request.get('http://foo.bar:9898/path/to/api')
        .on(ERROR_EVENT, addListener(ERROR_EVENT))

      await req.catch(_ => _)

      expect(events).toEqual([[ERROR_EVENT, [new Error('Connection aborted due to timeout')]]])
    })

    it('listens DONE event', async () => {
      registerNodeTransaction(['result1'])
      registerNodeTransaction(null, { failByTimeoutError: true })

      const req1 = Request.get('http://foo.bar:9898/path/to/api')
        .on(DONE_EVENT, addListener(DONE_EVENT))

      const req2 = Request.get('http://foo.bar:9898/path/to/api')
        .on(DONE_EVENT, addListener(DONE_EVENT))

      await req1
      await req2.catch(_ => _)

      expect(events).toEqual([[DONE_EVENT, [null, 'result1']], [DONE_EVENT, [new Error('Connection aborted due to timeout')]]])
    })

    it('can unsubscribe a listener from event', async () => {
      registerNodeTransaction(['result1'])

      const listener1 = jest.fn(addListener(DONE_EVENT))
      const listener2 = jest.fn(addListener(DONE_EVENT))

      const req1 = Request.get('http://foo.bar:9898/path/to/api')
        .on(DONE_EVENT, listener1)
        .on(DONE_EVENT, listener2)
        .off(DONE_EVENT, listener1)

      await req1

      expect(events).toEqual([[DONE_EVENT, [null, 'result1']],])

      expect(listener1.mock.calls).toHaveLength(0)

      expect(listener2.mock.calls).toEqual([[null, 'result1'],])
    })

    it('can unsubscribe all listeners from a specific event', async () => {
      registerNodeTransaction(['result1'])

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
      registerNodeTransaction(['result1'])

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
      expect({ isBrowser: isBrowser(), isNodeJS: isNodeJS() }).toEqual({
        isBrowser: false,
        isNodeJS : true
      })
    })

  })

})



