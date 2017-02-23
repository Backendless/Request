import { castArray } from './utils'

/**
 * Produces a URL query string from a given obj by iterating through the object's "own properties".
 * @param {Object} obj
 * @returns {string}
 */
export const stringify = obj => {
  const tokens = []

  Object.keys(obj).forEach(key => {
    const value = obj[key]

    if (value !== undefined) {
      castArray(value).forEach(value => {
        tokens.push(`${ encodeURIComponent(key) }=${ encodeURIComponent(value) }`)
      })
    }
  })

  return tokens.join('&')
}
