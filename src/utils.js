/**
 * Casts `value` as an array if it's not one.
 * Equvivalent to lodash/castArray
 */
export const castArray = value => {
  return Array.isArray(value) ? value : [value]
}

export const isObject = value => null != value && typeof value === 'object'

export const isFormData = value => {
  return value && value.constructor && value.constructor.toString().trim().indexOf('function FormData') === 0
}

export const isStream = value => {
  const stream = require('stream')

  return value instanceof stream.Stream
}
