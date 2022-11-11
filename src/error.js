export class ResponseError extends Error {
  constructor(response) {
    super()

    const error = parseError(response)

    this.message = error.message || error
    this.code = error.code

    this.status = response.status
    this.headers = response.headers
    this.body = response.body
  }
}

function parseError(res) {
  if (res.status === 502) {
    return 'No connection with server'
  }

  return res.body || `Status Code ${res.status} (${res.statusText})`
}
