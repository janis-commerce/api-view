# API View

[![Build Status](https://travis-ci.org/janis-commerce/api-view.svg?branch=master)](https://travis-ci.org/janis-commerce/api-view)
[![Coverage Status](https://coveralls.io/repos/github/janis-commerce/api-view/badge.svg?branch=master)](https://coveralls.io/github/janis-commerce/api-view?branch=master)

A package for managing API View from any origin.

## Installation

```
npm install @janiscommerce/api-view
```

## Dispatcher
* **new Dispatcher( object )**
Construct a Dispatcher with the request information

* async **.dispatch()**
This method dispatch the api instance.
Returns an object with `code` and the `body`.

## API
You should extend your apis from this module.

* **pathParameters** (*getter*). Returns the path parameters of the request. The `entity` and `entityId` if present.

* **headers** (*getter*). Returns the the headers of the request.

* **cookies** (*getter*). Returns the the cookies of the request.

* **setCode(code)**. Set a response httpCode. `code` must be a integer.

* **setHeader(headerName, headerValue)**. Set an individual response header. `headerName` must be a string.

* **setHeaders(headers)**. Set response headers. `headers` must be an object with "key-value" headers.

* **setCookie(cookieName, cookieValue)**. Set an individual response cookie. `cookieName` must be a string.

* **setCookies(cookies)**. Set response cookies. `cookies` must be an object with "key-value" cookies.

* **setBody(body)**. Set the response body.

## Usage

* How to process a `browse` request

```js
const { Dispatcher } = require('@janiscommerce/api-view');

const dispatcher = new Dispatcher({
	entity: 'product',
	action: 'browse',
	method: 'data'
});

const result = await dispatcher.dispatch();

console.log(result);
/**
	expected output:

	{
		code: 200,
		body: [
			{
				id: 5928,
				name: 'Great product',
				price: 45.1,
				category: 'Beverages'
			}, {
				id: 5929,
				name: 'Another great product',
				price: 32.0,
				category: 'groceries'
			}
		]
	}
*/
```

* How to process an `edit` request

```js
const { Dispatcher } = require('@janiscommerce/api-view');

const dispatcher = new Dispatcher({
	entity: 'product',
	action: 'edit',
	method: 'data',
	entity: 5928
});

const result = await dispatcher.dispatch();

console.log(result);
/**
	expected output:

	{
		code: 200,
		body: {
			id: 5928,
			name: 'Great product',
			price: 45.1,
			category: 'Beverages'
		}
	}
*/
```