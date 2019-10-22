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

- [Request Methods](#request-methods)
  - [GET](#get)
  - [POST](#post)
  - [PUT](#put)
  - [DELETE](#delete)
  - [PATCH](#patch)

- [Query Params](#query-params)

- [Request Body](#request-body)
  - [Form](#form)
  - [ContentType Header](#contenttype-header)

- [Request Events](#request-events)

- [Caching Requests](#caching-requests)
  - [Cache Tags](#cache-tags)
  - [Reset Cache](#reset-cache)

- [Own XMLHttpRequest](#own-xmlhttprequest)

- [Logging](#logging)

## How to use

### Install
for installing just execute the following command:
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
<script src="/path-to-backandless-request-package/dist/backendless-request.js"></script>
````

you can use minimized file as well
````html
<script src="/path-to-backandless-request-package/dist/backendless-request.min.js"></script>
````

After that you can use `BackendlessRequest` from the global scope 

````js
BackendlessRequest.get('http://foo.bar/')
````

### Request Methods

#### GET

````js
BackendlessRequest.get('http://foo.bar/')
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### POST

````js
BackendlessRequest.post('http://foo.bar/', { foo: 'bar', bool: true, num: 1 })
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### PUT

````js
BackendlessRequest.put('http://foo.bar/', { num: 123 })
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### DELETE

````js
BackendlessRequest.delete('http://foo.bar/foo')
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### PATCH

````js
BackendlessRequest.patch('http://foo.bar/foo', { bool: false })
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

### Query Params
You can set up request query through `.query(query)` method
and the library automatically add the query into request url
 
````js
// RequestUrl: http://foo.bar/some-path?str=some-string&num=123&bool=true&arr=1&arr=2&arr=3&arr=4
BackendlessRequest.get('http://foo.bar/some-path') 
  .query({ str: 'some-string', num: 123, bool: true, arr: [1, 2, 3, 4] })
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

### Request Body
You have an ability to send request body through `.send(body)` method, 
but if don't do that the method will be called with the second argument when you call `then` or `catch` method.  
 
````js
BackendlessRequest.post('http://foo.bar/some-path') 
  .send({ str: 'some-string', num: 123, bool: true, arr: [1, 2, 3, 4] })
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

````js
BackendlessRequest.post('http://foo.bar/some-path', { str: 'some-string', num: 123, bool: true, arr: [1, 2, 3, 4] }) 
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### Form
For sending form you should use `.form(form)` method 

````js
BackendlessRequest.post('http://foo.bar/')
  .form(form)
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### ContentType Header
For set up Content-Type header manually you can use `.type(contentTypeHeader)` method or set it via `.set('Content-Type', value)` method. 
If you pass an object as request body the `Content-Type` header will be automatically specified as `application/json` 

````js
BackendlessRequest.get('http://foo.bar/')
  .set('x-header-key', 'x-header-value')
  .set({ 'y-header-key': 'y-header-value', 'z-header-key': 'z-header-value' })
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

### Request Events
A request instance might fire events to notify about changing request state:

for subscribing use method `.on(<eventName>, callback)`

````js
BackendlessRequest.post('http://foo.bar/some-path')
  .on('request', req => req.set('my-x-header-key', 'my-x-header-value')) 
  .on('response', result => console.log('result', result)) 
  .on('error', error => console.log('error', error))
  .on('done', (error, result) => console.log('done', { error, result })) 
  .send({ str: 'some-string', num: 123, bool: true, arr: [1, 2, 3, 4] })
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

- `request` - it will be fired before sending request to the server
- `response` - it will be fired when request is successfully completed 
- `error` - it will be fired when request is failed
- `done` - it will be fired when request is done, it's a shortcut for `response` and `error`
 
 
### Caching Requests
The feature provides you to have some responses cached and reset the cache by the next requests.

#### Cache Tags
Cache tags help you to keep your cache up-to-date 
 
For example you have route to retrieve a list of `Persons` and you want to cache the result for the same requests, 
for it you need to specify a cache tag and set `TTL` via `useCache` method, 
after that when you do the request again the response will be retrieved from the cache store.

````js
// get list of persons
BackendlessRequest.get('http://your-domain.com/persons')
  .cacheTags(['persons'])
  .useCache(30 * 1000) // cache time to live is 30 seconds, by default it's 15 seconds
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

You can use as many tags as you need 

````js
// get list of persons
BackendlessRequest.get('http://your-domain.com/persons')
  .cacheTags(['persons', 'friends', 'posts'])
  .useCache()
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

#### Reset Cache
In many cases you want to reset the cache when do some requests which can change values on the server 

````js
// create a new persons
BackendlessRequest.post('http://your-domain.com/persons', { name: 'Bob' })
  .cacheTags(['persons'])
  .resetCache(true)
  .then(result => console.log(result))
  .catch(error => console.error(error))
````

````js
// create a new persons
BackendlessRequest.delete('http://your-domain.com/persons/personId')
  .cacheTags(['persons'])
  .resetCache(true)
  .then(result => console.log(result))
  .catch(error => console.error(error))
```` 

### Own XMLHttpRequest
You can use your own XMLHttpRequest, just replace it for `BackendlessRequest` namespace.

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
If you want to logging all the requests just set `true` for `verbose`

````js
BackendlessRequest.verbose = true
````   

