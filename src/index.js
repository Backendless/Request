import { sendNodeAPIRequest } from './client-node'
import { sendXmlHttpRequest } from './client-browser'
import { Request } from './request'

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
