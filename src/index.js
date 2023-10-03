import { sendNodeAPIRequest } from './client-node'
import { sendXmlHttpRequest } from './client-browser'
import { Request } from './request'
import { isNodeJS } from './utils'

let CustomFormData = null

Object.defineProperty(Request, 'FormData', {
  get() {
    if (CustomFormData) {
      return CustomFormData
    }

    return isNodeJS() || typeof FormData === 'undefined'
      ? require('form-data')
      : FormData
  },

  set(value) {
    CustomFormData = value
  }
})

Request.XMLHttpRequest = typeof XMLHttpRequest !== 'undefined' ? XMLHttpRequest : undefined

Request.send = (path, method, headers, body, encoding, timeout, withCredentials) => {
  const sender = typeof Request.XMLHttpRequest !== 'undefined'
    ? sendXmlHttpRequest
    : sendNodeAPIRequest

  return sender(path, method, headers, body, encoding, timeout, withCredentials)
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
