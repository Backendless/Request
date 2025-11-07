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

Request.send = (path, method, headers, body, encoding, timeout, withCredentials, abortSignal) => {
  const sender = typeof Request.XMLHttpRequest !== 'undefined'
    ? sendXmlHttpRequest
    : sendNodeAPIRequest

  return sender(path, method, headers, body, encoding, timeout, withCredentials, abortSignal)
}

Request.verbose = false
Request.withCredentials = false

Request.methods = ['get', 'post', 'put', 'patch', 'delete']
Request.methods.forEach(method => {
  Request[method] = function(path, body) {
    return new Request(path, method, body)
  }
})

exports = module.exports = Request

export default Request
