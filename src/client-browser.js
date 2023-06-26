import { Request } from './request'

export function sendXmlHttpRequest(path, method, headers, body, encoding, timeout, withCredentials) {
  return new Promise(function sendRequest(resolve, reject) {
    let request = new Request.XMLHttpRequest()

    request.timeout = timeout

    if (!encoding) {
      request.responseType = 'arraybuffer'
    }

    request.open(method.toUpperCase(), path, true)

    if (typeof withCredentials === 'boolean') {
      request.withCredentials = withCredentials
    }

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

