import { sendNodeAPIRequest } from './client-node'
import { sendXmlHttpRequest } from './client-browser'
import { Request } from './request'
import { getFormData, setFormData } from './utils'

Object.defineProperty(Request, 'FormData', {
  get() {
    return getFormData()
  },

  set(value) {
    setFormData(value)
  }
})

Request.XMLHttpRequest = typeof XMLHttpRequest !== 'undefined' ? XMLHttpRequest : undefined

// `tlsOptions` is meaningful for the Node client only, XMLHttpRequest gives no control over the
// client certificate - a browser picks it from the OS/browser keystore when a server asks for one
Request.send = (path, method, headers, body, encoding, timeout, withCredentials, tlsOptions) => {
  const sender = typeof Request.XMLHttpRequest !== 'undefined'
    ? sendXmlHttpRequest
    : sendNodeAPIRequest

  return sender(path, method, headers, body, encoding, timeout, withCredentials, tlsOptions)
}

Request.verbose = false
Request.withCredentials = false

Request.methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
Request.methods.forEach(method => {
  Request[method] = function(path, body) {
    return new Request(path, method, body)
  }
})

exports = module.exports = Request

export default Request
