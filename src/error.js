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

/**
 * An error which is raised when a TLS connection can not be established.
 *
 * A raw TLS failure surfaces as an opaque socket error (ECONNRESET, EPROTO, an OpenSSL code),
 * which makes the most common operational failures - a missing, rejected or expired client
 * certificate - indistinguishable from a network problem.
 *
 * Never put any part of the certificate, the private key or the passphrase into the message,
 * the reasons below are the only text this error is built from.
 */
export class TLSError extends Error {
  constructor(reason, cause) {
    super(cause && cause.code ? `${reason} (${cause.code})` : reason)

    this.name = 'TLSError'
    this.code = (cause && cause.code) || 'TLS_ERROR'

    if (cause) {
      this.cause = cause
    }
  }
}

// the local certificate/key material can not even be loaded, the connection is never attempted
const SECURE_CONTEXT_REASONS = [
  {
    match: /bad decrypt|bad password read|wrong final block length/i,
    reason: 'The private key could not be decrypted, the passphrase is missing or incorrect.',
  },
  {
    match: /no start line|not enough data|PEM_read_bio|DECODER routines/i,
    reason: 'The client certificate or the private key is not valid PEM.',
  },
  {
    match: /key values mismatch/i,
    reason: 'The private key does not match the client certificate.',
  },
]

// the server refused our client certificate during the handshake
const HANDSHAKE_ALERT_REASONS = [
  {
    // the server demands a client certificate before it looks at anything else, including auth
    match: /certificate[ _]required/i,
    reason: 'The server requires a client certificate and none was supplied.',
  },
  {
    match: /certificate expired/i,
    reason: 'The server rejected the client certificate because it has expired.',
  },
  {
    match: /certificate revoked/i,
    reason: 'The server rejected the client certificate because it has been revoked.',
  },
  {
    match: /unknown ca/i,
    reason: 'The server does not trust the authority which issued the client certificate.',
  },
  {
    match: /(bad|unsupported|unknown|no) certificate/i,
    reason: 'The server rejected the client certificate.',
  },
  {
    match: /handshake failure/i,
    reason: 'The server rejected the TLS handshake, the client certificate is missing or was rejected.',
  },
]

// the certificate presented by the server could not be verified
const NO_CA_REASON = 'The server certificate could not be verified, a CA bundle may be required.'

const PEER_CERTIFICATE_REASONS = {
  CERT_HAS_EXPIRED                 : 'The server certificate has expired.',
  CERT_NOT_YET_VALID               : 'The server certificate is not valid yet.',
  SELF_SIGNED_CERT_IN_CHAIN        : 'The server certificate chain is self signed, a CA bundle may be required.',
  DEPTH_ZERO_SELF_SIGNED_CERT      : 'The server certificate is self signed, a CA bundle may be required.',
  ERR_TLS_CERT_ALTNAME_INVALID     : 'The server certificate does not match the requested host.',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE  : NO_CA_REASON,
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: NO_CA_REASON,
}

function findReason(reasons, text) {
  const found = reasons.find(({ match }) => match.test(text))

  return found && found.reason
}

function findPeerCertificateReason(code) {
  return code && PEER_CERTIFICATE_REASONS.hasOwnProperty(code)
    ? PEER_CERTIFICATE_REASONS[code]
    : undefined
}

/**
 * Converts a low level socket/OpenSSL failure into a TLSError with an actionable message.
 *
 * @param {Error} error the error raised by the http client
 * @param {Boolean} withClientCert whether a client certificate was supplied for this request
 * @returns {TLSError|null} null when the error is not TLS related and should be reported as is
 */
export function toTLSError(error, withClientCert) {
  if (!error) {
    return null
  }

  const text = `${error.code || ''} ${error.message || ''}`

  const reason = findPeerCertificateReason(error.code)
    || findReason(SECURE_CONTEXT_REASONS, text)
    || findReason(HANDSHAKE_ALERT_REASONS, text)

  if (reason) {
    return new TLSError(reason, error)
  }

  // a server which demands a client certificate usually just drops the connection when it does not
  // get one it accepts, there is no alert to read, so this is the best guess we can offer
  if (withClientCert && (error.code === 'ECONNRESET' || error.code === 'EPROTO')) {
    return new TLSError(
      'The connection was closed during the TLS handshake, '
      + 'the client certificate was most likely missing, rejected or expired.',
      error
    )
  }

  return null
}
