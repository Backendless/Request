# Backendless Request   
[![npm version](https://img.shields.io/npm/v/backendless-request.svg?style=flat)](https://www.npmjs.com/package/backendless-request)

Simple Node.js and Browser REST client
````
backendless.js => ~ 28 KB
backendless.min.js => ~ 11 KB
````

- [How to use](#how-to-use)
  - [Install](#install)
  - [Require it as a module](#require-it-as-a-module)
  - [Include it as a single file](#include-it-as-a-single-file)
  - [As a part of the JS-SDK](#as-a-part-of-the-js-sdk)
  - [In the UI Builder and JS Cloud Code environment](#in-the-ui-builder-and-js-cloud-code-environment)

- [Request Methods](#request-methods)
  - [GET](#get)
  - [POST](#post)
  - [PUT](#put)
  - [DELETE](#delete)
  - [PATCH](#patch)
  - [HEAD](#head)
  - [OPTIONS](#options)

- [Query Params](#query-params)

- [Request Body](#request-body)
  - [Form](#form)
  - [ContentType Header](#contenttype-header)

- [Client Certificate (mutual TLS)](#client-certificate-mutual-tls)

- [Request Events](#request-events)

- [Caching Requests](#caching-requests)
  - [Cache Tags](#cache-tags)
  - [Reset Cache](#reset-cache)

- [Own XMLHttpRequest](#own-xmlhttprequest)

- [Logging](#logging)

## How to use

### Install
for installation just execute the following command:
````
npm i backendless-request -S
````

### Require it as a module 

````js
import BackendlessRequest from 'backendless-request';

//or

const BackendlessRequest = require('backendless-request');
````

### Include it as a single file

Inside the installed package you can find a `dist` directory, where are two js files `backendless-request.js` and `backendless-request.min.js`
````
-|
 - dist
    |-backendless.js
    |-backendless.min.js
 
````

Get one of the js files into your project
````html
<script src="/path-to-backendless-request-package/dist/backendless-request.js"></script>
````

you can use minimized file as well
````html
<script src="/path-to-backendless-request-package/dist/backendless-request.min.js"></script>
````

After that you can use `BackendlessRequest` from the global scope 

````js
BackendlessRequest.get('http://foo.bar/')
````

### As a part of the JS-SDK
Since the JS-SDK already uses the module for API requests, therefor if you use the SDK in your code you can use the Request module as well in your code without additional require, see the example below: 

````js
import Backendless from 'backendless';

Backendless.Request.get('https://foo.bar/')
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

### In the UI Builder and JS Cloud Code environment
The Backendless UI Builder and JS Cloud Code include the Backendless JS-SDK in the global scope, therefor the Request module is also available there, see the example below: 

````js

Backendless.Request.get('https://foo.bar/')
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

### Request Methods

#### GET

````js
BackendlessRequest.get('https://foo.bar/')
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### POST

````js
BackendlessRequest.post('https://foo.bar/', { foo: 'bar', bool: true, num: 1 })
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### PUT

````js
BackendlessRequest.put('https://foo.bar/', { num: 123 })
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### DELETE

````js
BackendlessRequest.delete('https://foo.bar/foo')
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### PATCH

````js
BackendlessRequest.patch('https://foo.bar/foo', { bool: false })
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### HEAD

A HEAD response has no body, so the useful part of the result are the response headers,
use `.unwrapBody(false)` to get the whole response instead of its body

````js
BackendlessRequest.head('https://foo.bar/foo')
  .unwrapBody(false)
  .then(result => console.log(result.status, result.headers))
  .catch(error => console.error(error))
````

#### OPTIONS

````js
BackendlessRequest.options('https://foo.bar/foo')
  .unwrapBody(false)
  .then(result => console.log(result.headers))
  .catch(error => console.error(error))
````

### Query Params
You can set up a request query through `.query(query)` method
and the library will automatically add the query to request url
 
````js
// RequestUrl: https://foo.bar/some-path?str=some-string&num=123&bool=true&arr=1&arr=2&arr=3&arr=4
BackendlessRequest.get('https://foo.bar/some-path') 
  .query({ str: 'some-string', num: 123, bool: true, list: [1, 2, 3, 4] })
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

### Request Body
You can send request body through the `.send(body)` method,
but if you don't do that, the method will be called with the second argument when you call `then` or `catch` method.  
 
````js
BackendlessRequest.post('https://foo.bar/some-path') 
  .send({ str: 'some-string', num: 123, bool: true, list: [1, 2, 3, 4] })
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

````js
BackendlessRequest.post('https://foo.bar/some-path', { str: 'some-string', num: 123, bool: true, list: [1, 2, 3, 4] }) 
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### Form
For sending a form you should use `.form(form)` method 

````js
BackendlessRequest.post('http://foo.bar/')
  .form(form)
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### ContentType Header
To manually set up the Content-Type header, you can use the `.type(contentTypeHeader)` method or set it via `.set('Content-Type', value)` method. 
If you pass an object as a request body the `Content-Type` header will be automatically specified as `application/json` 

````js
BackendlessRequest.get('https://foo.bar/')
  .set('x-header-key', 'x-header-value')
  .set({ 'y-header-key': 'y-header-value', 'z-header-key': 'z-header-value' })
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

### Client Certificate (mutual TLS)
Some APIs, most of them in regulated banking, require the client to present a TLS certificate of its own
before they will answer at all. Use the `.cert(tlsOptions)` method to attach one.

````js
BackendlessRequest.post('https://api.vendor.com/some-path')
  .cert({
    cert      : clientCertPem,   // PEM encoded client certificate (or chain)
    key       : clientKeyPem,    // PEM encoded private key
    passphrase: keyPassphrase,   // optional, for an encrypted private key
    ca        : caBundlePem      // optional, a custom CA bundle to verify the server with
  })
  .set({ 'Content-Type': 'application/json' })
  .send(body)
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

Every option accepts a `String`, a `Buffer` or an array of them, exactly as the Node
[TLS options](https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions) do.
Options other than the four above are ignored, so a connection can not be weakened by accident.

The method can be called several times and the options are merged, which lets the certificate and the
key come from different places:

````js
BackendlessRequest.get('https://api.vendor.com/accounts')
  .cert({ cert: clientCertPem, key: clientKeyPem })
  .cert({ ca: caBundlePem })
````

A few things worth knowing:

- **The certificate must be attached to the token request too.** Servers of this kind usually demand the
  certificate before authentication, so their OAuth2 token endpoint is unreachable without it as well.
- **It works in Node.js only.** In a browser `XMLHttpRequest` gives no control over the client certificate,
  the browser picks one from the keystore itself, so `.cert()` there does nothing.
- **A client certificate requires an `https://` URL.** Sending it over `http://` would silently drop it and
  put the request on the wire in plain text, so the request fails instead.
- **`ca` replaces the default trust store** for that request, the same way `curl --cacert` does. Pass the
  full chain that is needed to verify the server.
- **The private key is credential material.** Store it the way you store a password, never inline it into a
  URL. The library keeps it out of `BackendlessRequest.verbose` output and off the enumerable properties of
  the request, so it does not end up in a log through `console.log(request)` or `JSON.stringify(request)`.

#### TLS errors
A failed handshake would otherwise surface as an opaque socket error, so recognized failures are raised as a
`TLSError` with a message that says what went wrong. `error.code` keeps the original Node/OpenSSL code and
`error.cause` the original error.

````
The server requires a client certificate and none was supplied. (ERR_SSL_TLSV13_ALERT_CERTIFICATE_REQUIRED)
The server rejected the client certificate because it has expired. (EPROTO)
The private key could not be decrypted, the passphrase is missing or incorrect. (ERR_OSSL_BAD_DECRYPT)
The client certificate or the private key is not valid PEM. (ERR_OSSL_PEM_NO_START_LINE)
The server certificate has expired. (CERT_HAS_EXPIRED)
The server certificate could not be verified, a CA bundle may be required. (UNABLE_TO_VERIFY_LEAF_SIGNATURE)
````

When a server just drops the connection instead of sending a TLS alert, which is what a TLS 1.3 server
typically does when it does not accept the certificate, the error says so:

````
The connection was closed during the TLS handshake, the client certificate was most likely missing,
rejected or expired. (ECONNRESET)
````

Errors which have nothing to do with TLS are left untouched.

### Request Events
A request instance might fire events to notify about changing request state:

for subscribing use method `.on(<eventName>, callback)`

````js
BackendlessRequest.post('https://foo.bar/some-path')
  .on('request', req => req.set('my-x-header-key', 'my-x-header-value')) 
  .on('response', result => console.log('result', result)) 
  .on('error', error => console.log('error', error))
  .on('done', (error, result) => console.log('done', { error, result })) 
  .send({ str: 'some-string', num: 123, bool: true, list: [1, 2, 3, 4] })
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

- `request` - it will be fired before sending a request to the server
- `response` - it will be fired when a request is successfully completed 
- `error` - it will be fired when a request is failed
- `done` - it will be fired when a request is done, it's a shortcut for `response` and `error`
 
 
### Caching Requests
The feature allows you to have some responses cached and reset the cache by the next requests.

#### Cache Tags
Cache tags help you to keep your cache up-to-date 
 
For example, you have a route to retrieve a list of `Persons` and you want to cache the result for the same requests, 
for this, you need to specify a cache tag and set `TTL` via `useCache` method, 
after that when you do the request again the response will be retrieved from the cache store.

````js
// get list of persons
BackendlessRequest.get('https://your-domain.com/persons')
  .cacheTags(['persons'])
  .useCache(30 * 1000) // cache time to live is 30 seconds, by default it's 15 seconds
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

You can use as many tags as you need 

````js
// get list of persons
BackendlessRequest.get('https://your-domain.com/persons')
  .cacheTags(['persons', 'friends', 'posts'])
  .useCache()
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### Reset Cache
In many cases you want to reset the cache when doing some requests that can change values on the server 

````js
// create a new person
BackendlessRequest.post('https://your-domain.com/persons', { name: 'Bob' })
  .cacheTags(['persons'])
  .resetCache(true)
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

````js
// create a new person
BackendlessRequest.delete('https://your-domain.com/persons/personId')
  .cacheTags(['persons'])
  .resetCache(true)
  .then(result => console.log(result))
  .catch(error => console.error(error))
```` 

### Own XMLHttpRequest
You can use your own XMLHttpRequest, just replace it in `BackendlessRequest` namespace.

[See Example](https://github.com/Backendless/backendless-appcelerator/blob/master/lib/backendless-appcelerator.js#L278) 

````js

class MySupperXMLHttpRequest {
  
  open(){
    
  }
  
  ...
  
  send(){
    
  }
}

BackendlessRequest.XMLHttpRequest = MySupperXMLHttpRequest
````

### Logging
If you want to log all the requests just set `true` for `verbose`

````js
BackendlessRequest.verbose = true
````   

