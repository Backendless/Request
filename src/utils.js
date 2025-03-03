/**
 * Casts `value` as an array if it's not one.
 * Equivalent to lodash/castArray
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

const SAFE_CHAR_CODES = ['%40', '%3A', '%2F', '%23']

function safeEscape(str, charCodes) {
  const char = charCodes[0]

  if (char) {
    const tokens = str.split(char).map(p => safeEscape(p, charCodes.slice(1)))

    return tokens.join(char)
  }

  return encodeURI(str)
}

function ensureComponentEncoding(uriComponent) {
  if (uriComponent === decodeURI(uriComponent)) {
    return safeEscape(uriComponent, [...SAFE_CHAR_CODES])
  }

  return uriComponent
}

function encodePath(path) {
  return path.split('/').map(ensureComponentEncoding).join('/')
}

export function ensureEncoding(path) {
  try {
    const url = new URL(path)

    return url.origin + encodePath(normalizeTrailingSlashInPath(path, url)) + url.search
  } catch {
    return encodePath(path)
  }
}

export function normalizeTrailingSlashInPath(originPath, { pathname }) {
  if (originPath.includes('?')) {
    originPath = originPath.split('?')[0]
  }

  const keepTrailingSlash = originPath.endsWith('/')

  return (!keepTrailingSlash && pathname.endsWith('/'))
    ? pathname.slice(0, -1)
    : pathname
}
