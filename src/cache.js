/**
 * @typedef {Object} CacheItem
 * @property {*} value
 * @property {Array.<RegExp|String>} tags
 * @property {Number} ttl
 */

/**
 * @param {*} value
 * @param {Array.<RegExp|String>}tags
 * @param {Number} ttl
 * @returns {CacheItem}
 */
const cacheItem = (value, tags, ttl) => ({ value, tags, ttl })

const currentTime = () => new Date().getTime()

/**
 * Returns true if tag A matches tag B :
 *  - if they are non-strictly equal
 *  - if one of them is Regexp matching the opposite
 *
 * @param {String|RegExp} a
 * @param {String|RegExp} b
 * @returns {Boolean}
 */
const tagsMatches = (a, b) => {
  let result = a == b // eslint-disable-line

  if (!result && a instanceof RegExp) {
    result = a.test(b)
  }

  if (!result && b instanceof RegExp) {
    result = b.test(a)
  }

  return result
}

/**
 * Returns true if any of A tags matches any of B tags
 *
 * @param {Array.<String|RegExp>} a
 * @param {Array.<String|RegExp>} b
 * @returns {Boolean}
 */
const tagsContainMatches = (a, b) => {
  return !!a.find(aTag => b.find(bTag => tagsMatches(aTag, bTag)))
}

/**
 * A Cache with TTL and optional tags for the keys
 * Makes it possible to assign multiple tags for a key and delete keys by tags
 * Optionally it starts flushing timer which cleans all outdated keys
 */
class Cache {

  /**
   * @param {Number?} flushInterval
   */
  constructor(flushInterval) {
    this.setFlushInterval(flushInterval)

    /**
     * @type {Map.<String, CacheItem>}
     */
    this.map = new Map()
  }

  setFlushInterval(flushInterval) {
    this.flushInterval = flushInterval

    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      delete this.flushTimer
    }
  }

  /**
   * @param {String} key
   * @returns {*}
   */
  get(key) {
    const cacheItem = this.map.get(key)

    if (cacheItem) {
      if (cacheItem.ttl > currentTime()) {
        return cacheItem.value
      } else {
        this.map.delete(key)
      }
    }
  }

  /**
   * @param {String} key
   * @param {*} value
   * @param {Array.<RegExp|String>=} tags
   * @param {Number=} ttl
   */
  set(key, value, tags, ttl ) {
    this.map.set(key, cacheItem(value, tags, currentTime() + ttl))

    if (this.flushInterval && !this.flushTimer) {
      this.flushTimer = setInterval(this.flush.bind(this), this.flushInterval)

      if (this.flushTimer.unref) {
        this.flushTimer.unref()
      }
    }
  }

  /**
   * @param {String} key
   */
  delete(key) {
    this.map.delete(key)
  }

  deleteAll() {
    for (const [key] of this.map) {
      this.delete(key)
    }
  }

  /**
   * @param {Array.<String>} tags
   */
  deleteByTags(tags) {
    for (const [key, value] of this.map) {
      if (value.tags && tagsContainMatches(tags, value.tags)) {
        this.delete(key)
      }
    }
  }

  /**
   * Deletes all outdated keys
   */
  flush() {
    const now = currentTime()

    for (const [key, value] of this.map) {
      if (value.ttl < now) {
        this.delete(key)
      }
    }
  }
}

const CACHE_FLUSH_INTERVAL = 60000 //60 sec

export const cache = new Cache(CACHE_FLUSH_INTERVAL)

