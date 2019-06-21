'use strict';

const Fetcher = require('./fetcher');

const APIView = require('./api-view');
const APIViewError = require('./error');

class Dispatcher {

	constructor(requestData) {
		this._validateRequestData(requestData);

		this.entity = requestData.entity;
		this.action = requestData.action;
		this.method = requestData.method;
		this.entityId = requestData.entityId;

		this.data = requestData.data || {};
		this.headers = requestData.headers || {};
		this.cookies = requestData.cookies || {};
	}

	/**
	 * Determines if object.
	 *
	 * @param {any} value The value
	 * @return {boolean} True if object, False otherwise.
	 */
	_isObject(value) {
		return typeof value === 'object' && !Array.isArray(value);
	}

	/**
	 * Validates the requestData
	 *
	 * @param {any} requestData The request data
	 */
	_validateRequestData(requestData) {

		if(!this._isObject(requestData))
			throw new APIViewError('request data must be an Object', APIViewError.codes.INVALID_REQUEST_DATA);

		if(typeof requestData.entity !== 'string')
			throw new APIViewError('entity must be an String', APIViewError.codes.INVALID_ENTITY);

		if(typeof requestData.action !== 'string')
			throw new APIViewError('action must be an String', APIViewError.codes.INVALID_ACTION);

		if(typeof requestData.method !== 'string')
			throw new APIViewError('method must be an String', APIViewError.codes.INVALID_METHOD);

		if(typeof requestData.headers !== 'undefined'
			&& !this._isObject(requestData.headers))
			throw new APIViewError('headers must be an Object', APIViewError.codes.INVALID_HEADERS);

		if(typeof requestData.cookies !== 'undefined'
			&& !this._isObject(requestData.cookies))
			throw new APIViewError('cookies must be an Object', APIViewError.codes.INVALID_COOKIES);
	}

	/**
	 * API Dispatch
	 *
	 */
	async dispatch() {

		this.prepare();

		await this.validate();

		await this.process();

		return this.response();
	}

	prepare() {

		try {

			const fetcher = new Fetcher(this.entity, this.action, this.method);

			this.api = fetcher.apiController;
			this.api.data = this.data;
			this.api.entity = this.entity;
			this.api.pathParameters = this.entityId ? [this.entityId] : [];
			this.api.headers = this.headers;
			this.api.cookies = this.cookies;

		} catch(err) {

			this.api = new APIView(); // para poder setear error correctamente

			/**
			 * Errores posibiles:
			 * 	1. no encuentra el archivo en api/path/file.js
			 * 	2. el archivo no exporta una clase
			 */
			this.setResponseError(err.message, 500);
		}
	}

	async validate() {

		if(this.hasError)
			return;

		try {

			// API request validation
			if(this.api.validate && typeof this.api.validate === 'function')
				await this.api.validate();

		} catch(err) {

			const code = 400;
			const message = err.message || 'data invalid';

			this.setResponseError(message, code);
		}
	}

	async process() {

		if(this.hasError)
			return;

		try {

			// call api controller process
			await this.api.process();

		} catch(err) {

			const code = 500;
			const message = err.message || 'internal server error';

			this.setResponseError(message, code);
		}
	}

	setResponseError(message, httpCode) {
		this.hasError = true;

		if(!this.api.response.code)
			this.api.setCode(httpCode);

		this.api
			.setBody({ message });
	}

	response() {

		if(!this.api.response.code)
			this.api.setCode(200);

		return this.api.response;
	}
}

module.exports = Dispatcher;
