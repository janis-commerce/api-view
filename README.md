# API View

[![Build Status](https://travis-ci.org/janis-commerce/api-view.svg?branch=master)](https://travis-ci.org/janis-commerce/api-view)
[![Coverage Status](https://coveralls.io/repos/github/janis-commerce/api-view/badge.svg?branch=master)](https://coveralls.io/github/janis-commerce/api-view?branch=master)

A package for managing API View from any origin.

## Installation

```
npm install @janiscommerce/api-view
```

## API
* **new APIView( object )**
Construct an API

* async **.dispatch()**
This method dispatch the api instance.
Returns an object with `code` and the `result`.

## Usage

* How to process a `browse` request

```js
const API = require('@janiscommerce/api-view');

const myApiView = new APIView({
	entity: 'product',
	action: 'browse',
	method: 'data'
});

const result = await myApiView.dispatch();

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
const API = require('@janiscommerce/api-view');

const myApiView = new APIView({
	entity: 'product',
	action: 'edit',
	method: 'data',
	entity: 5928
});

const result = await myApiView.dispatch();

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