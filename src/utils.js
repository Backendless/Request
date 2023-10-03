/**
 * Casts `value` as an array if it's not one.
 * Equvivalent to lodash/castArray
 */
export const castArray = value => {
  return Array.isArray(value) ? value : [value]
}

export const isObject = value => null != value && typeof value === 'object'

export const isFormData = value => {
  if (!value) {
    return false
  }

  const FormData = getFormData()

  if (value instanceof FormData) {
    return true
  }

  return value && value.constructor && value.constructor.toString().trim().indexOf('function FormData') === 0
}

export const isStream = value => {
  const stream = require('stream')

  return value instanceof stream.Stream
}

export const isNodeJS = () => {
  return typeof process !== 'undefined' && process.versions != null && process.versions.node != null
}

export const isBrowser = () => {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined'
}

let CustomFormData = null

export function getFormData() {
  if (CustomFormData) {
    return CustomFormData
  }

  return isNodeJS() || typeof FormData === 'undefined'
    ? require('form-data')
    : FormData
}

export function setFormData(value) {
  CustomFormData = value
}

