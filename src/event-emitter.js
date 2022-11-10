export default class EventEmitter {

  constructor() {
    this.events = {}
  }

  on(eventName, callback) {
    this.events[eventName] = this.events[eventName] || []
    this.events[eventName].push(callback)

    return this
  }

  off(eventName, callback) {
    if (!eventName) {
      this.events = {}

    } else if (this.events[eventName]) {
      if (callback) {
        this.events[eventName] = this.events[eventName].filter(c => c !== callback)
      } else {
        delete this.events[eventName]
      }
    }

    return this
  }

  emit(eventName, ...args) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(callback => callback(...args))
    }
  }
}
