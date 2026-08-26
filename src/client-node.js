import { isFormData, isStream, normalizeTrailingSlashInPath } from './utils'
import { TLSError, toTLSError } from './error'

export function sendNodeAPIRequest(path, method, headers, body, encoding, timeout, withCredentials, tlsOptions) {
  return new Promise((resolve, reject) => {
    const u = require('url').parse(path)
    const form = isFormData(body) && body

    const https = u.protocol === 'https:'
    const options = {
      host: u.hostname,
      port: u.port || (https ? 443 : 80),
      path: normalizeTrailingSlashInPath(path, u) + (u.search || ''),
      method,
      headers,
      timeout,
    }

    if (typeof withCredentials === 'boolean') {
      options.withCredentials = withCredentials
    }

    const withClientCert = !!(tlsOptions && (tlsOptions.cert || tlsOptions.key))

    if (tlsOptions) {
      if (!https) {
        // going ahead would silently drop the certificate and send the request in plain text,
        // there is no mutual TLS without TLS
        return reject(new TLSError('A client certificate can only be used with an https:// URL.'))
      }

      Object.assign(options, tlsOptions)
    }

    // a TLS failure arrives here as an opaque socket/OpenSSL error, translate the ones we recognize
    const rejectWithError = error => reject(toTLSError(error, withClientCert) || error)

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

        res.on('error', rejectWithError)
      })

      req.on('error', rejectWithError)

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

    // an unusable certificate/key/passphrase makes https.request() throw synchronously, and for a
    // form body _send() runs from a callback where a throw would escape the promise altogether
    const send = () => {
      try {
        _send()
      } catch (error) {
        rejectWithError(error)
      }
    }

    if (form) {
      Object.assign(options.headers, form.getHeaders())

      form.getLength(function(err, length) {
        if (!err && !isNaN(length)) {
          options.headers['content-length'] = length
        }

        send()
      })
    } else {
      if (body && !options.headers['content-length']) {
        const Buffer = require('buffer').Buffer
        options.headers['content-length'] = Buffer.byteLength(body)
      }

      send()
    }
  })
}
